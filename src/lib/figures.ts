import * as mupdf from "mupdf";
import sharp from "sharp";

export type RasterFigure = {
  page: number; // 1-based
  webp: Buffer;
  width: number;
  height: number;
};

// Which wiki topic a figure belongs to. Prefer the model's slug hint (mapped to
// the full wiki slug {fileTag}-{slug}); else the topic whose page span covers the
// figure's page; else null (figure still stored, just not pinned to a topic).
export function resolveFigureTopic(
  topics: { slug: string; pages?: number[] }[],
  fileTag: string,
  fig: { page: number; topic_slug?: string }
): string | null {
  if (fig.topic_slug && topics.some((t) => t.slug === fig.topic_slug))
    return `${fileTag}-${fig.topic_slug}`;
  const byPage = topics.find((t) => t.pages?.includes(fig.page));
  return byPage ? `${fileTag}-${byPage.slug}` : null;
}

// Rasterize the given 1-based PDF pages to compressed WebP. Figure pages only —
// the caller decides which pages carry a figure worth keeping. Bad pages are
// skipped (logged), never thrown: figures are an enhancement, not core.
export async function rasterizePages(
  pdf: Uint8Array,
  pages: number[]
): Promise<RasterFigure[]> {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const total = doc.countPages();
  const out: RasterFigure[] = [];
  const seen = new Set<number>();

  for (const p of pages) {
    if (!Number.isInteger(p) || p < 1 || p > total || seen.has(p)) continue;
    seen.add(p);
    try {
      const page = doc.loadPage(p - 1);
      // scale 2 ≈ 144 DPI — crisp enough for diagrams/graphs, small enough to store.
      const pix = page.toPixmap(
        mupdf.Matrix.scale(2, 2),
        mupdf.ColorSpace.DeviceRGB,
        false
      );
      const png = pix.asPNG();
      const { data, info } = await sharp(Buffer.from(png))
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer({ resolveWithObject: true });
      out.push({ page: p, webp: data, width: info.width, height: info.height });
    } catch (e) {
      console.error(
        `rasterize page ${p} failed:`,
        e instanceof Error ? e.message : e
      );
    }
  }
  return out;
}
