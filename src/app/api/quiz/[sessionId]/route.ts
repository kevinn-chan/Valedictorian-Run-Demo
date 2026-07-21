import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContext } from "@/lib/answer";
import { llm } from "@/lib/llm";

export const maxDuration = 300;

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).describe("exactly 4 options"),
      answer: z.number().int().describe("index 0-3 of the correct option"),
      explanation: z.string().describe("one-sentence why, quoting the corpus"),
      page: z.number().int().describe("corpus page where the answer is found"),
    })
  ),
});

// ponytail: quiz is generated fresh each time and lives in the response —
// no table; persist results only if exam-history tracking is ever wanted.
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

  try {
    const { system } = await buildContext(supabase, sessionId, "mock exam");
    const { object } = await generateObject({
      model: llm(),
      schema: QuizSchema,
      system,
      prompt: `Create a 10-question mock exam over this corpus.
- Mix easy recall, mechanism understanding, and calculation questions (use the corpus formulas with small concrete numbers).
- Exactly 4 options each, one correct; wrong options must be plausible misconceptions.
- Every question answerable strictly from the corpus; cite the page.`,
    });
    return NextResponse.json({ questions: object.questions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quiz generation failed" },
      { status: 500 }
    );
  }
}
