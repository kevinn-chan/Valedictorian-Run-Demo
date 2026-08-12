import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

// Titles + mastery gaps, not full topic markdown — a per-session plan schedules
// what to study within one course, this schedules WHICH courses when, so it
// doesn't need the content itself (keeps the prompt small across N sessions).
export async function generateStudyPlan(
  supabase: SupabaseClient,
  userId: string,
  focus: string
): Promise<string> {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, exam_date")
    .eq("user_id", userId);
  if (!sessions?.length) throw new Error("No sessions to plan across yet.");

  const sessionIds = sessions.map((s) => s.id);
  const [{ data: topics }, { data: cards }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("session_id, slug, title")
      .eq("kind", "topic")
      .in("session_id", sessionIds),
    supabase.from("cards").select("session_id, topic_slug, reps").in("session_id", sessionIds),
  ]);
  if (!topics?.length) throw new Error("Compile at least one file first — the plan is built from the corpus wikis.");

  const today = new Date().toISOString().slice(0, 10);
  const courseBlocks = sessions
    .map((s) => {
      const courseTopics = (topics ?? []).filter((t) => t.session_id === s.id);
      if (!courseTopics.length) return null;
      const topicLines = courseTopics
        .map((t) => {
          const cs = (cards ?? []).filter((c) => c.session_id === s.id && c.topic_slug === t.slug);
          const pct = cs.length ? Math.round((cs.filter((c) => c.reps >= 2).length / cs.length) * 100) : null;
          return `  - ${t.title}${pct === null ? "" : ` (mastery ${pct}%)`}`;
        })
        .join("\n");
      return `### ${s.title}${s.exam_date ? ` — exam ${s.exam_date}` : " — no exam date set"}\n${topicLines}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const { text } = await generateText({
    model: llm(),
    prompt: `You are a study coach helping a student juggling multiple courses at once. Today is ${today}.
${focus ? `This week's priority: ${focus}\n` : ""}
Courses and their topics (mastery % is share of that topic's flashcards graded correctly twice; missing % means no cards yet):

${courseBlocks}

Write ONE unified weekly schedule in markdown that interleaves these courses:
- Prioritize courses with closer exam dates, and within each course, the lowest-mastery topics.
- Courses with no exam date get lower urgency — light maintenance passes, not the bulk of the schedule.
- Reference ONLY the topics listed above, by their exact titles. Do not invent topics or courses.
- Day-by-day for the next 7 days, naming which course + topic(s) per day and roughly how long.
- End with a one-line note on what to reassess next week.`,
  });

  const { error } = await supabase.from("study_plans").insert({
    user_id: userId,
    markdown: text,
    inputs: { focus },
  });
  if (error) throw new Error(error.message);

  return text;
}
