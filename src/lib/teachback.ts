import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

const GradeSchema = z.object({
  score: z
    .number()
    .int()
    .describe("0-100: how complete AND correct the explanation is"),
  verdict: z
    .string()
    .describe("one direct, encouraging sentence summarizing the grade"),
  strengths: z
    .array(z.string())
    .describe("specific things the student explained correctly"),
  corrections: z
    .array(
      z.object({
        claim: z.string().describe("what the student said, briefly"),
        fix: z.string().describe("the corrected fact from the source"),
        page: z.number().int().describe("source page for the correction"),
      })
    )
    .describe("wrong or imprecise claims (empty if none)"),
  missing: z
    .array(
      z.object({
        point: z.string().describe("an important point the explanation left out"),
        page: z.number().int(),
      })
    )
    .describe("key points not covered (empty if the explanation was complete)"),
});

export type TeachbackGrade = z.infer<typeof GradeSchema> & {
  topicTitle: string;
};

export async function gradeTeachback(
  supabase: SupabaseClient,
  sessionId: string,
  topicSlug: string,
  explanation: string
): Promise<TeachbackGrade> {
  const { data: topic } = await supabase
    .from("wiki_pages")
    .select("title, markdown, source_refs")
    .eq("session_id", sessionId)
    .eq("slug", topicSlug)
    .single();
  if (!topic) throw new Error("topic not found");

  const pages = (topic.source_refs as { pages?: number[] } | null)?.pages ?? [];
  const { data: chunks } = await supabase
    .from("chunks")
    .select("page_from, page_to, text")
    .eq("session_id", sessionId)
    .order("page_from");
  const relevant =
    pages.length && chunks
      ? chunks.filter((c) => pages.some((p) => p >= c.page_from && p <= c.page_to))
      : (chunks ?? []);
  const corpus = relevant
    .map((c) => `[p.${c.page_from}-${c.page_to}]\n${c.text}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: llm(),
    schema: GradeSchema,
    prompt: `A student just tried to teach back "${topic.title}" from memory. Grade their explanation STRICTLY against the source material — the fastest way to find gaps in understanding.

SOURCE PAGES:
${corpus}

COMPILED SUMMARY (for reference):
${topic.markdown}

STUDENT'S EXPLANATION:
${explanation}

Rules:
- Judge ONLY against the source material; do not penalize for things it doesn't cover.
- Every correction and missing point cites its source page.
- Corrections are for wrong/imprecise claims; missing is for important omissions. Empty arrays are fine.
- Be encouraging but precise — a good teacher, not a cheerleader.
- Plain-text formulas (2^(k-1)), never LaTeX.`,
  });

  return { topicTitle: topic.title, ...object };
}
