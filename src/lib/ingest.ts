import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

// ponytail: inline PDF bytes in the request; switch to the Gemini Files API
// if decks ever exceed ~15 MB (inline request ceiling is ~20 MB).
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

const CompileSchema = z.object({
  digest: z
    .string()
    .describe(
      "A thorough markdown study digest of the whole file: what it covers, key ideas, definitions, formulas, and what a student must master. Use headings and lists."
    ),
  topics: z
    .array(
      z.object({
        slug: z
          .string()
          .describe("kebab-case identifier, e.g. sliding-window-protocol"),
        title: z.string(),
        summary: z
          .string()
          .describe(
            "A study-ready markdown wiki page for this topic (200-500 words) with ## sections, page references like (p. 12), and plain-text formulas"
          ),
        pages: z.array(z.number().int()).describe("page numbers covering this topic"),
      })
    )
    .describe("The distinct topics/concepts this file teaches"),
  chunks: z
    .array(
      z.object({
        page_from: z.number().int(),
        page_to: z.number().int(),
        text: z
          .string()
          .describe(
            "The COMPLETE text content of these pages, transcribed faithfully — every heading, bullet, definition, formula, and caption. Describe diagrams briefly in [brackets]."
          ),
      })
    )
    .describe(
      "Cover EVERY page of the document exactly once, in order, in small spans (1-3 pages each)"
    ),
});

const COMPILE_PROMPT = `You are compiling a student's course file into a corpus library they will study from INSTEAD of re-reading the original deck.
1. "chunks": cover every page in order (spans of 1-3 pages). Transcribe ALL text content — every heading, bullet, definition, formula, and caption; the corpus must contain every word of the document. Describe figures/diagrams briefly in [brackets].
2. "topics": the distinct concepts taught. Each summary is a STUDY-READY wiki page in markdown, roughly 200-500 words:
   - open with a 1-2 sentence overview of what the topic is and why it matters
   - "## Key ideas" — the mechanism/behaviour explained precisely, step by step where the source does
   - "## Formulas & facts" — every formula, bound, and constant from the source with each symbol defined (omit the section only if the topic has none)
   - "## Watch out" — misconceptions, edge cases, and likely exam traps grounded in the source
   - cite pages inline like (p. 12) throughout
3. "digest": a markdown study digest of the entire file: what it covers, how the topics build on each other, and what to master first.
Write formulas in plain text/Unicode (e.g. U = 1/(1+2a), W = 2^(k-1)) — never LaTeX delimiters like $...$.
Do not invent content that is not in the document.`;

// Belt for the prompt's no-LaTeX rule: strip $...$ / $$...$$ delimiters the
// model sneaks in anyway (wiki-facing markdown only; chunks stay verbatim).
const stripLatex = (s: string) => s.replace(/\$\$?([^$\n]+?)\$\$?/g, "$1");

export async function ingestFile(
  supabase: SupabaseClient,
  fileId: string
): Promise<{ chunks: number; topics: number }> {
  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, session_id, storage_path, name, mime")
    .eq("id", fileId)
    .single();
  if (fileErr || !file) throw new Error(fileErr?.message ?? "file not found");

  await supabase
    .from("files")
    .update({ ingest_status: "processing" })
    .eq("id", file.id);

  const { data: blob, error: dlErr } = await supabase.storage
    .from("session-files")
    .download(file.storage_path);
  if (dlErr || !blob) throw new Error(dlErr?.message ?? "download failed");
  if (blob.size > MAX_INLINE_BYTES)
    throw new Error("file too large to compile (>15 MB) — split the PDF");

  const bytes = new Uint8Array(await blob.arrayBuffer());

  const { object } = await generateObject({
    model: llm(),
    schema: CompileSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: bytes,
            mediaType: file.mime || "application/pdf",
            filename: file.name,
          },
          { type: "text", text: COMPILE_PROMPT },
        ],
      },
    ],
  });

  // Re-ingest safe: replace this file's previous chunks and wiki pages.
  const fileTag = file.id.slice(0, 8);
  await supabase.from("chunks").delete().eq("file_id", file.id);
  await supabase
    .from("wiki_pages")
    .delete()
    .eq("session_id", file.session_id)
    .like("slug", `${fileTag}-%`);

  const { error: chunkErr } = await supabase.from("chunks").insert(
    object.chunks.map((c) => ({
      file_id: file.id,
      session_id: file.session_id,
      page_from: c.page_from,
      page_to: c.page_to,
      text: c.text,
    }))
  );
  if (chunkErr) throw new Error(chunkErr.message);

  const wikiRows = [
    {
      session_id: file.session_id,
      slug: `${fileTag}-digest`,
      kind: "file_digest",
      title: file.name,
      markdown: stripLatex(object.digest),
      source_refs: { file_id: file.id },
    },
    ...object.topics.map((t) => ({
      session_id: file.session_id,
      slug: `${fileTag}-${t.slug}`,
      kind: "topic",
      title: t.title,
      markdown: stripLatex(t.summary),
      source_refs: { file_id: file.id, pages: t.pages },
    })),
  ];
  const { error: wikiErr } = await supabase.from("wiki_pages").insert(wikiRows);
  if (wikiErr) throw new Error(wikiErr.message);

  const pages = Math.max(...object.chunks.map((c) => c.page_to), 0);
  await supabase
    .from("files")
    .update({ ingest_status: "done", pages })
    .eq("id", file.id);

  return { chunks: object.chunks.length, topics: object.topics.length };
}
