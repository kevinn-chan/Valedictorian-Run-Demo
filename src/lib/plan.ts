import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

export async function generatePlan(
  supabase: SupabaseClient,
  sessionId: string,
  goal: string,
  examDate: string
): Promise<string> {
  const { data: pages, error } = await supabase
    .from("wiki_pages")
    .select("kind, title, markdown")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  const topics = pages?.filter((p) => p.kind === "topic") ?? [];
  if (!topics.length) throw new Error("Compile at least one file first — the plan is built from the corpus wiki.");

  const today = new Date().toISOString().slice(0, 10);
  const topicBlock = topics
    .map((t) => `### ${t.title}\n${t.markdown}`)
    .join("\n\n");

  const { text } = await generateText({
    model: llm(),
    prompt: `You are a study coach. Today is ${today}. The exam is on ${examDate}.
Student's goal: ${goal || "master all the material"}.

The corpus wiki for this course contains ONLY these topics:

${topicBlock}

Write a targeted study plan in markdown:
- A day-by-day (or session-by-session) schedule from today until the exam date, with realistic pacing and built-in revision passes near the exam.
- Reference ONLY the topics listed above, by their exact titles. Do not invent topics.
- For each scheduled block: which topic(s), what to do (read the wiki page, work the examples, self-test), and roughly how long.
- End with a short "day before the exam" checklist.`,
  });

  const { error: insErr } = await supabase.from("learning_plans").insert({
    session_id: sessionId,
    markdown: text,
    inputs: { goal, exam_date: examDate },
  });
  if (insErr) throw new Error(insErr.message);
  await supabase
    .from("sessions")
    .update({ goal_text: goal, exam_date: examDate })
    .eq("id", sessionId);

  return text;
}
