import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContext } from "@/lib/answer";
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
  const lastUser = messages.filter((m) => m.role === "user").at(-1);
  const question =
    lastUser?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  let system: string;
  try {
    ({ system } = await buildContext(supabase, sessionId, question));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "context failed" },
      { status: 400 }
    );
  }

  const chatId = await getOrCreateChat(supabase, sessionId);
  if (question) {
    await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "user", content: question });
  }

  const result = streamText({
    model: llm(),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
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
