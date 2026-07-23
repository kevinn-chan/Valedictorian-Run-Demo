import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { buildContext, selectFigureImages } from "@/lib/answer";
import { DEMO_SESSION_ID, demoReader } from "@/lib/demo";
import { llm } from "@/lib/llm";

export const maxDuration = 60;

// Keep the public demo from starving the real app's Gemini quota: use a
// separate DEMO_GEMINI_KEY if provided, otherwise fall back to the main key.
function demoModel() {
  const key = process.env.DEMO_GEMINI_KEY;
  return key
    ? createGoogleGenerativeAI({ apiKey: key })("gemini-flash-latest")
    : llm();
}

export async function POST(request: NextRequest) {
  if (!DEMO_SESSION_ID) {
    return NextResponse.json({ error: "demo not configured" }, { status: 404 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();

  if (!messages?.length) {
    return NextResponse.json({ error: "no messages" }, { status: 400 });
  }

  // Cheap abuse guard: the public demo is a short, read-only conversation.
  if (messages.length > 12) {
    return NextResponse.json(
      { error: "The demo keeps chats short — reload to start over." },
      { status: 429 }
    );
  }

  const lastUser = messages.filter((m) => m.role === "user").at(-1);
  const question =
    lastUser?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "";

  const reader = demoReader();
  let system: string;
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  let images: Awaited<ReturnType<typeof selectFigureImages>>;
  try {
    // Corpus read (service-role, no user session), figure selection, and message
    // conversion are independent — overlap them so time-to-first-token isn't the
    // sum of three sequential round-trips.
    const [ctx, imgs, mm] = await Promise.all([
      buildContext(reader, DEMO_SESSION_ID, question),
      selectFigureImages(reader, DEMO_SESSION_ID, question),
      convertToModelMessages(messages),
    ]);
    system = ctx.system;
    images = imgs;
    modelMessages = mm;
  } catch {
    return NextResponse.json({ error: "demo unavailable" }, { status: 400 });
  }
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

  // Stream only — the demo never persists messages.
  const result = streamText({
    model: demoModel(),
    system,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
