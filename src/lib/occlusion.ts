// Image-occlusion flashcards. A card hides a rectangular region of a stored
// figure and asks the student to recall the label underneath. These are ordinary
// `cards` rows — they ride the existing SRS scheduling, review queue, and
// analytics untouched; only their rendering in ReviewClient branches on the
// `occlusion` marker in source_ref. Rects are stored as fractions (0..1) of the
// figure, so they survive any display size.

export type Region = { x: number; y: number; w: number; h: number; label: string };

export type OcclusionRef = {
  kind: "occlusion";
  figureId: string;
  rect: { x: number; y: number; w: number; h: number };
  // Source page of the figure, so occlusion cards cite "p. N" like text cards.
  // Optional: cards created before this was threaded through simply omit it.
  page?: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Convert a vision model's bounding box — Gemini's native [ymin, xmin, ymax, xmax]
// normalized to 0..1000 — into our 0..1 {x,y,w,h} rect. Kept pure (no `ai`/server
// imports) so occlusion.ts stays safe to import from the client bundle.
export function boxToRect(box: number[]): { x: number; y: number; w: number; h: number } {
  const [ymin, xmin, ymax, xmax] = box;
  return {
    x: clamp01(Math.min(xmin, xmax) / 1000),
    y: clamp01(Math.min(ymin, ymax) / 1000),
    w: clamp01(Math.abs(xmax - xmin) / 1000),
    h: clamp01(Math.abs(ymax - ymin) / 1000),
  };
}

export type OcclusionCardRow = {
  session_id: string;
  topic_slug: string | null;
  front: string;
  back: string;
  source_ref: OcclusionRef;
};

// Turn drawn regions into card rows. Empty-label or degenerate (stray-tap) regions
// are dropped, not thrown — the caller rejects only when nothing valid remains.
export function buildOcclusionCards(
  sessionId: string,
  figureId: string,
  topicSlug: string | null,
  caption: string | null,
  regions: Region[],
  page: number | null
): OcclusionCardRow[] {
  const rows: OcclusionCardRow[] = [];
  for (const r of regions) {
    const label = (r.label ?? "").trim();
    if (!label) continue;
    if (![r.x, r.y, r.w, r.h].every((n) => Number.isFinite(n))) continue;
    // Ignore boxes too small to be a deliberate selection (< 0.5% of a side).
    if (!(r.w > 0.005 && r.h > 0.005)) continue;
    rows.push({
      session_id: sessionId,
      topic_slug: topicSlug,
      front: caption ? `Recall the hidden label — ${caption}` : "What is hidden here?",
      back: label,
      source_ref: {
        kind: "occlusion",
        figureId,
        rect: {
          x: clamp01(r.x),
          y: clamp01(r.y),
          w: clamp01(r.w),
          h: clamp01(r.h),
        },
        ...(typeof page === "number" ? { page } : {}),
      },
    });
  }
  return rows;
}
