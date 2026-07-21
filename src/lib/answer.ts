import type { SupabaseClient } from "@supabase/supabase-js";

// Tier A: whole compiled corpus in context (fits easily in Flash's 1M window
// for typical sessions). Tier B: FTS-selected chunks + all topic summaries.
const TIER_A_MAX_CHARS = 600_000;

type ChunkRow = {
  page_from: number;
  page_to: number;
  text: string;
  files: { name: string } | null;
};

function label(c: ChunkRow) {
  const name = c.files?.name ?? "file";
  const pages =
    c.page_from === c.page_to
      ? `p.${c.page_from}`
      : `p.${c.page_from}-${c.page_to}`;
  return `[${name} ${pages}]`;
}

export async function buildContext(
  supabase: SupabaseClient,
  sessionId: string,
  question: string
): Promise<{ system: string; tier: "A" | "B" }> {
  const { data, error } = await supabase
    .from("chunks")
    .select("page_from, page_to, text, files(name)")
    .eq("session_id", sessionId)
    .order("page_from");
  if (error) throw new Error(error.message);
  const chunks = (data ?? []) as unknown as ChunkRow[];
  if (!chunks.length)
    throw new Error("Compile at least one file first — the chat answers only from the corpus.");

  const total = chunks.reduce((n, c) => n + c.text.length, 0);
  let tier: "A" | "B" = "A";
  let corpus: string;

  if (total <= TIER_A_MAX_CHARS) {
    corpus = chunks.map((c) => `${label(c)}\n${c.text}`).join("\n\n");
  } else {
    tier = "B";
    const [{ data: hits }, { data: topics }] = await Promise.all([
      supabase
        .from("chunks")
        .select("page_from, page_to, text, files(name)")
        .eq("session_id", sessionId)
        .textSearch("tsv", question, { type: "websearch" })
        .limit(12),
      supabase
        .from("wiki_pages")
        .select("title, markdown")
        .eq("session_id", sessionId)
        .eq("kind", "topic"),
    ]);
    const topicBlock = (topics ?? [])
      .map((t) => `## ${t.title}\n${t.markdown}`)
      .join("\n\n");
    const hitBlock = ((hits ?? []) as unknown as ChunkRow[])
      .map((c) => `${label(c)}\n${c.text}`)
      .join("\n\n");
    corpus = `# Topic summaries\n${topicBlock}\n\n# Relevant source pages\n${hitBlock}`;
  }

  const system = `You are the study assistant for a student's course corpus. Answer questions using ONLY the corpus below.

Rules:
- Every factual claim must cite its source inline as [filename p.N] using the labels provided. One page per bracket — write [file p.28] [file p.31], never [file p.28, 31].
- Quote formulas and definitions exactly as they appear in the corpus, in plain text/Unicode (e.g. U = 1/(1+2a), W = 2^(k-1)) — never LaTeX delimiters like $...$ or \\text{}.
- If the answer is not in the corpus, reply: "That isn't in your session materials." — optionally pointing to the closest related topic that IS covered. Never answer from outside knowledge.
- Be a clear, calm study partner: direct answers first, then brief explanation.

CORPUS:
${corpus}`;

  return { system, tier };
}
