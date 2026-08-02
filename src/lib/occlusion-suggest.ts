import { generateObject } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";
import { boxToRect, type Region } from "./occlusion.ts";

// Server-only: asks the vision model to find the printed labels on a figure and
// return each with a bounding box, which we convert to our 0..1 rects. The boxes
// are proposals — the editor lets the user nudge/prune them — so imperfect
// coordinates are fine; the win is not having to retype labels off the image.
// Imports `ai`, so this file must never be pulled into a client component.

const MAX_REGIONS = 20;

const SuggestSchema = z.object({
  regions: z.array(
    z.object({
      label: z
        .string()
        .describe("the exact text of the label/callout as printed on the figure"),
      box_2d: z
        .array(z.number())
        .length(4)
        .describe("bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000"),
    })
  ),
});

export async function suggestOcclusionRegions(
  supabase: SupabaseClient,
  figureId: string
): Promise<Region[]> {
  const { data: fig } = await supabase
    .from("figures")
    .select("storage_path, caption")
    .eq("id", figureId)
    .single();
  if (!fig) throw new Error("figure not found");

  const { data: blob } = await supabase.storage
    .from("session-files")
    .download(fig.storage_path as string);
  if (!blob) throw new Error("figure image unavailable");
  const image = new Uint8Array(await blob.arrayBuffer());

  const { object } = await generateObject({
    model: llm(),
    schema: SuggestSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image, mediaType: "image/webp" },
          {
            type: "text",
            text: `This is a figure captioned "${fig.caption ?? ""}". Find every printed text label, callout, or annotation on it that a student should be able to recall from memory — part names, axis labels, key terms, formulas. For each, return its exact text and a tight bounding box around just that text. Ignore decorative titles, long sentences, and page numbers.`,
          },
        ],
      },
    ],
  });

  return (object.regions ?? [])
    .map((r) => ({ ...boxToRect(r.box_2d), label: r.label.trim() }))
    // Drop empty labels and degenerate boxes here so the editor only shows usable ones.
    .filter((r) => r.label && r.w > 0.005 && r.h > 0.005)
    .slice(0, MAX_REGIONS);
}
