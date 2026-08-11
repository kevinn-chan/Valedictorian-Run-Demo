import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

const CardsSchema = z.object({
  cards: z.array(
    z.object({
      topic_slug: z.string().describe("slug of the wiki topic this card belongs to"),
      front: z.string().describe("A precise question or prompt"),
      back: z.string().describe("The answer, complete but tight"),
      page: z.number().int().describe("the corpus page number where the answer is found"),
    })
  ),
});

export async function generateCards(
  supabase: SupabaseClient,
  sessionId: string
): Promise<number> {
  const [{ data: topics }, { data: chunks }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("slug, title, markdown")
      .eq("session_id", sessionId)
      .eq("kind", "topic"),
    supabase
      .from("chunks")
      .select("page_from, page_to, text, files(name)")
      .eq("session_id", sessionId)
      .order("page_from"),
  ]);
  if (!topics?.length || !chunks?.length)
    throw new Error("Compile at least one file first.");

  const corpus = chunks
    .map(
      (c) =>
        `[${(c.files as unknown as { name: string })?.name ?? "file"} p.${c.page_from}-${c.page_to}]\n${c.text}`
    )
    .join("\n\n");
  const topicList = topics.map((t) => `- ${t.slug}: ${t.title}`).join("\n");

  const { object } = await generateObject({
    model: llm(),
    schema: CardsSchema,
    prompt: `Create spaced-repetition flashcards from this course corpus.

Topics (use these exact slugs):
${topicList}

Corpus (page-labeled):
${corpus}

Rules:
- 4-8 cards per topic: definitions, mechanisms, comparisons, and any formulas/calculations.
- Answers must come ONLY from the corpus; each card cites the page number where its answer appears.
- Fronts are specific questions ("Why does Go-back-N discard out-of-order frames?"), never vague prompts ("Explain ARQ").`,
  });

  // Replace previous deck for the session (re-generation resets progress)
  await supabase.from("cards").delete().eq("session_id", sessionId);
  const { error } = await supabase.from("cards").insert(
    object.cards.map((c) => ({
      session_id: sessionId,
      topic_slug: c.topic_slug,
      front: c.front,
      back: c.back,
      source_ref: { page: c.page },
    }))
  );
  if (error) throw new Error(error.message);
  return object.cards.length;
}

const TopicCardsSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string().describe("A precise question or prompt"),
      back: z.string().describe("The answer, complete but tight"),
      page: z.number().int().describe("the page number (from the inline (p. N) citations) where the answer is found"),
    })
  ),
});

/** Adds cards to a single topic without touching the rest of the deck —
 * generateCards() replaces the whole session's deck and resets SRS progress,
 * which is wrong for "give me a few more on this one topic". Uses the
 * topic's own wiki markdown (already has inline (p. N) citations) as
 * context instead of the full corpus. */
export async function generateTopicCards(
  supabase: SupabaseClient,
  sessionId: string,
  topicSlug: string,
  mode: "more" | "harder"
): Promise<number> {
  const [{ data: topic }, { data: existing }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("title, markdown")
      .eq("session_id", sessionId)
      .eq("slug", topicSlug)
      .eq("kind", "topic")
      .single(),
    supabase.from("cards").select("front").eq("session_id", sessionId).eq("topic_slug", topicSlug),
  ]);
  if (!topic) throw new Error("Topic not found.");

  const avoid = (existing ?? []).map((c) => `- ${c.front}`).join("\n");
  const instruction =
    mode === "harder"
      ? "Write 5 harder cards testing application and analysis (not recall) — apply a concept to a new scenario, compare/contrast, or work through a calculation. Skip plain definition recall."
      : "Write 5 more cards: definitions, mechanisms, comparisons, or calculations not already covered below.";

  const { object } = await generateObject({
    model: llm(),
    schema: TopicCardsSchema,
    prompt: `Create spaced-repetition flashcards for one topic from a study wiki.

Topic: ${topic.title}

Content (page citations inline as "(p. N)"):
${topic.markdown}

${existing?.length ? `Cards that already exist for this topic — do not repeat these:\n${avoid}\n\n` : ""}${instruction}
Answers must come only from the content above; each card cites the page number of its nearest (p. N) citation.`,
  });

  const { error } = await supabase.from("cards").insert(
    object.cards.map((c) => ({
      session_id: sessionId,
      topic_slug: topicSlug,
      front: c.front,
      back: c.back,
      source_ref: { page: c.page },
    }))
  );
  if (error) throw new Error(error.message);
  return object.cards.length;
}
