import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rasterizePages } from "@/lib/figures";

// Renders one PDF page as a webp image, on demand — for wiki citation chips
// ("(p. N)") that open the actual source page inline instead of the raw PDF.
// RLS-scoped lookup + download (not the service role) so this can only ever
// touch files the caller's own sessions own.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; page: string }> }
) {
  const { fileId, page } = await params;
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return NextResponse.json({ error: "invalid page" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("session-files")
    .download(file.storage_path);
  if (dlErr || !blob) {
    return NextResponse.json({ error: "download failed" }, { status: 500 });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const [raster] = await rasterizePages(bytes, [pageNum]);
  if (!raster) {
    return NextResponse.json({ error: "page not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(raster.webp), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
