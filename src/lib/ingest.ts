import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";
import { rasterizePages, resolveFigureTopic } from "./figures.ts";

// Gemini's inline-request ceiling is ~20 MB; under that we send raw bytes
// (fast, no extra round trip). Above it we use the Files API (upload once,
// reference by URI) up to the Storage bucket's own 50 MB cap.
const MAX_INLINE_BYTES = 15 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Resumable-upload the PDF to Gemini's Files API and return its file URI.
// ponytail: no polling for ACTIVE state — Gemini processes PDFs synchronously,
// unlike video/audio, so the file is usable immediately after upload.
async function uploadToGeminiFiles(
  bytes: Uint8Array,
  mimeType: string,
  displayName: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
  const start = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl)
    throw new Error(`Gemini file upload init failed: ${await start.text()}`);

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes as BodyInit,
  });
  if (!upload.ok)
    throw new Error(`Gemini file upload failed: ${await upload.text()}`);
  const { file } = (await upload.json()) as { file: { uri: string } };
  return file.uri;
}

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
  figures: z
    .array(
      z.object({
        page: z
          .number()
          .int()
          .describe("the 1-based page number the figure appears on"),
        caption: z
          .string()
          .describe(
            "a one-line description of what the figure shows, for alt text and search (e.g. 'Cross-section of the human heart with labelled chambers')"
          ),
        topic_slug: z
          .string()
          .optional()
          .describe("slug of the topic (from the topics list) this figure illustrates, if any"),
        kind: z
          .enum(["diagram", "graph", "chart", "anatomy", "table", "other"])
          .optional(),
      })
    )
    .describe(
      "Pages that contain a figure worth keeping as an image — anatomy diagrams, graphs, charts, labelled illustrations, simple diagrams, supporting tables, screenshots (e.g. of code or software UI), and any visual a student would want to see again while reviewing. It does not have to be complex or elaborate. Skip decorative logos, title pages, and text-only pages. Empty array if the document is entirely text."
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
4. "figures": list the pages that contain a figure worth keeping as an image — anatomy diagrams, graphs, charts, labelled illustrations, simple diagrams, supporting tables, screenshots (e.g. of code or software UI), and any visual a student would want to see again while reviewing; it does not have to be complex or elaborate. Give each a one-line caption and, where possible, the slug of the topic it illustrates. Skip decorative logos, title pages, and text-only pages.
Write formulas in plain text/Unicode (e.g. U = 1/(1+2a), W = 2^(k-1)) — never LaTeX delimiters like $...$.
Do not invent content that is not in the document.`;

// Belt for the prompt's no-LaTeX rule: strip $...$ / $$...$$ delimiters the
// model sneaks in anyway (wiki-facing markdown only; chunks stay verbatim).
const stripLatex = (s: string) => s.replace(/\$\$?([^$\n]+?)\$\$?/g, "$1");

// Recompile-safe card re-tagging. On recompile the LLM redraws topic slugs, so a
// card's stored topic_slug no longer matches any topic (it orphans → Ungrouped).
// A card knows its source page (source_ref.page) and every new topic knows the
// pages it covers, so remap by page overlap — most specific (fewest pages) wins.
// Returns the new slug, or null to leave the card where it is.
export function pickTopicSlug(
  page: number | null | undefined,
  topics: { slug: string; pages: number[] }[]
): string | null {
  if (page == null) return null;
  const matches = topics.filter((t) => t.pages?.includes(page));
  if (!matches.length) return null;
  return matches.sort((a, b) => a.pages.length - b.pages.length)[0].slug;
}

// Diff a file's existing figure rows against the freshly-compiled page list, by
// page number, so recompile can UPDATE in place instead of delete-all/insert-all
// (which would mint new UUIDs and orphan occlusion cards that reference them).
export function diffFigures(
  existing: { id: string; page: number; storage_path: string }[],
  newPages: number[]
): {
  toUpdate: { id: string; page: number; storage_path: string }[];
  toInsert: number[];
  toDelete: { id: string; page: number; storage_path: string }[];
} {
  const newSet = new Set(newPages);
  const existByPage = new Map(existing.map((e) => [e.page, e]));
  return {
    toUpdate: existing.filter((e) => newSet.has(e.page)),
    toInsert: newPages.filter((p) => !existByPage.has(p)),
    toDelete: existing.filter((e) => !newSet.has(e.page)),
  };
}

// Re-point this file's cards at the just-inserted topics, preserving SRS state
// (we UPDATE topic_slug only — never delete/regenerate, which would wipe reps).
// The `${fileTag}-` prefix is stable across recompiles, so it identifies exactly
// this file's cards even after the slug tail drifted.
async function retagCards(
  supabase: SupabaseClient,
  sessionId: string,
  fileTag: string,
  topics: { slug: string; pages: number[] }[]
): Promise<number> {
  const { data: cards } = await supabase
    .from("cards")
    .select("id, topic_slug, source_ref")
    .eq("session_id", sessionId)
    .like("topic_slug", `${fileTag}-%`);
  if (!cards?.length) return 0;

  let moved = 0;
  // ponytail: per-card UPDATE (≤ a few hundred cards/file); batch via an RPC only
  // if a single file ever carries thousands of cards.
  for (const c of cards) {
    const page = (c.source_ref as { page?: number } | null)?.page;
    const next = pickTopicSlug(page, topics);
    if (next && next !== c.topic_slug) {
      await supabase.from("cards").update({ topic_slug: next }).eq("id", c.id);
      moved++;
    }
  }
  return moved;
}

export async function ingestFile(
  supabase: SupabaseClient,
  fileId: string
): Promise<{ chunks: number; topics: number; figures: number }> {
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
  if (blob.size > MAX_UPLOAD_BYTES)
    throw new Error("file too large to compile (>50 MB) — split the PDF");

  const mediaType = file.mime || "application/pdf";
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const filePart =
    blob.size > MAX_INLINE_BYTES
      ? {
          type: "file" as const,
          data: new URL(await uploadToGeminiFiles(bytes, mediaType, file.name)),
          mediaType,
          filename: file.name,
        }
      : {
          type: "file" as const,
          data: bytes,
          mediaType,
          filename: file.name,
        };

  const { object } = await generateObject({
    model: llm(),
    schema: CompileSchema,
    messages: [
      {
        role: "user",
        content: [filePart, { type: "text", text: COMPILE_PROMPT }],
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

  // Re-point existing cards at the new topic slugs (non-fatal — an orphaned card
  // just falls into the Ungrouped bucket, which analytics already handles).
  try {
    await retagCards(
      supabase,
      file.session_id,
      fileTag,
      object.topics.map((t) => ({ slug: `${fileTag}-${t.slug}`, pages: t.pages }))
    );
  } catch (e) {
    console.error(
      "card re-tag failed (cards unaffected):",
      e instanceof Error ? e.message : e
    );
  }

  // ---- figures: rasterize the pages the model flagged, store, and link to a
  // topic. Wrapped whole: an enhancement that must never fail the text compile. ----
  let figureCount = 0;
  try {
    figureCount = await ingestFigures(supabase, file, fileTag, bytes, object);
  } catch (e) {
    console.error(
      "figure step failed (text corpus unaffected):",
      e instanceof Error ? e.message : e
    );
  }

  const pages = Math.max(...object.chunks.map((c) => c.page_to), 0);
  await supabase
    .from("files")
    .update({ ingest_status: "done", pages })
    .eq("id", file.id);

  return {
    chunks: object.chunks.length,
    topics: object.topics.length,
    figures: figureCount,
  };
}

type CompileResult = z.infer<typeof CompileSchema>;

// Sync this file's figures (rows + storage) with the freshly-compiled page
// list: pages present before and after are UPDATEd in place (preserving their
// UUID, so occlusion cards referencing source_ref.figureId survive recompile),
// pages only in the old set are deleted, pages only in the new set are
// inserted. Rasterizes every wanted page (updates need fresh images too).
// Returns count stored.
async function ingestFigures(
  supabase: SupabaseClient,
  file: { id: string; session_id: string },
  fileTag: string,
  bytes: Uint8Array,
  object: CompileResult
): Promise<number> {
  const { data: existingRaw } = await supabase
    .from("figures")
    .select("id, page, storage_path")
    .eq("file_id", file.id);
  const existing = (existingRaw ?? []) as {
    id: string;
    page: number;
    storage_path: string;
  }[];

  const wanted = object.figures ?? [];
  const distinctPages = [
    ...new Set(
      wanted.map((f) => f.page).filter((p) => Number.isInteger(p) && p > 0)
    ),
  ];

  const { toUpdate, toInsert, toDelete } = diffFigures(existing, distinctPages);

  // Pages dropped from this recompile: remove their storage objects + rows.
  if (toDelete.length) {
    await supabase.storage
      .from("session-files")
      .remove(toDelete.map((f) => f.storage_path));
    await supabase
      .from("figures")
      .delete()
      .in("id", toDelete.map((f) => f.id));
  }

  if (!distinctPages.length) return 0;

  // Belt for orphaned objects from a prior run that stored but didn't record a
  // row — only applies to brand-new pages, never to pages we're updating.
  if (toInsert.length) {
    await supabase.storage
      .from("session-files")
      .remove(toInsert.map((p) => `${file.session_id}/fig_${fileTag}_p${p}.webp`));
  }

  const rasters = await rasterizePages(bytes, distinctPages);
  if (!rasters.length) return 0;

  const updateByPage = new Map(toUpdate.map((f) => [f.page, f]));
  const insertSet = new Set(toInsert);

  let stored = 0;
  const insertRows: Record<string, unknown>[] = [];
  for (const r of rasters) {
    const meta = wanted.find((f) => f.page === r.page);
    const path = `${file.session_id}/fig_${fileTag}_p${r.page}.webp`;
    const { error: upErr } = await supabase.storage
      .from("session-files")
      .upload(path, r.webp, { contentType: "image/webp", upsert: true });
    if (upErr) {
      console.error("figure upload failed", path, upErr.message);
      continue;
    }

    const fields = {
      caption: meta?.caption ?? null,
      topic_slug: meta ? resolveFigureTopic(object.topics, fileTag, meta) : null,
      kind: meta?.kind ?? null,
      width: r.width,
      height: r.height,
      storage_path: path,
    };

    const existingRow = updateByPage.get(r.page);
    if (existingRow) {
      const { error: updErr } = await supabase
        .from("figures")
        .update(fields)
        .eq("id", existingRow.id);
      if (updErr) {
        console.error("figure update failed:", updErr.message);
        continue;
      }
      stored++;
    } else if (insertSet.has(r.page)) {
      insertRows.push({
        file_id: file.id,
        session_id: file.session_id,
        page: r.page,
        ...fields,
      });
    }
  }

  if (insertRows.length) {
    const { error: figErr } = await supabase.from("figures").insert(insertRows);
    if (figErr) {
      console.error("figure insert failed:", figErr.message);
    } else {
      stored += insertRows.length;
    }
  }

  return stored;
}
