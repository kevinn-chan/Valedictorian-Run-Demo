import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { buildContext } from "@/lib/answer";
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

  let system: string;
  try {
    // Service-role read of the demo corpus — no user session involved.
    ({ system } = await buildContext(demoReader(), DEMO_SESSION_ID, question));
  } catch {
    return NextResponse.json({ error: "demo unavailable" }, { status: 400 });
  }

  // Stream only — the demo never persists messages.
  const result = streamText({
    model: demoModel(),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
