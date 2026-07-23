import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContext, selectFigureImages } from "@/lib/answer";
import { llm } from "@/lib/llm";

export const maxDuration = 300;

async function getOrCreateChat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
) {
  const { data: existing } = await supabase
    .from("chats")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: created } = await supabase
    .from("chats")
    .insert({ session_id: sessionId })
    .select("id")
    .single();
  return created?.id as string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  if (!messages?.length) {
    return NextResponse.json({ error: "no messages" }, { status: 400 });
  }
  const lastUser = messages.filter((m) => m.role === "user").at(-1);
  const question =
    lastUser?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  let system: string;
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  let images: Awaited<ReturnType<typeof selectFigureImages>>;
  try {
    // Corpus read, figure selection, and message conversion are independent —
    // overlap them instead of paying three sequential round-trips before streaming.
    const [ctx, imgs, mm] = await Promise.all([
      buildContext(supabase, sessionId, question),
      selectFigureImages(supabase, sessionId, question),
      convertToModelMessages(messages),
    ]);
    system = ctx.system;
    images = imgs;
    modelMessages = mm;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "context failed" },
      { status: 400 }
    );
  }

  // Persist the turn off the critical path: create/find the chat and record the
  // user message while the model streams; the id is awaited again at onFinish.
  // Non-fatal — a history write must never break the answer.
  const chatIdP = (async (): Promise<string | null> => {
    try {
      const chatId = await getOrCreateChat(supabase, sessionId);
      if (question) {
        await supabase
          .from("messages")
          .insert({ chat_id: chatId, role: "user", content: question });
      }
      return chatId;
    } catch {
      return null;
    }
  })();

  // Vision: attach the figure images relevant to this question so the model can
  // actually see the diagrams/graphs, still grounded in the same corpus.
  if (images.length) {
    const last = modelMessages.at(-1);
    if (last?.role === "user") {
      const content = Array.isArray(last.content)
        ? last.content
        : [{ type: "text" as const, text: String(last.content) }];
      last.content = [...content, ...images];
    }
    system +=
      "\n\nYou are also shown the actual figure images from pages in the corpus. Describe and explain them when relevant, still citing the page they came from.";
  }

  const result = streamText({
    model: llm(),
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      const chatId = await chatIdP;
      if (!chatId) return;
      const text = responseMessage.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (text) {
        await supabase
          .from("messages")
          .insert({ chat_id: chatId, role: "assistant", content: text });
      }
    },
  });
}
