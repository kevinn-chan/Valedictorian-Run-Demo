import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rasterizePages } from "@/lib/figures";
import { DEMO_SESSION_ID, demoReader } from "@/lib/demo";
import { isRateLimited } from "@/lib/rate-limit";

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
  const { data: mine } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  // Demo fallback, same rule as /api/figure: anonymous visitors may render pages
  // of the one public demo session's files and nothing else. Rasterizing is
  // CPU-heavy, so it's rate-limited per IP.
  let file = mine as { storage_path: string } | null;
  let storage = supabase.storage;
  if (!file) {
    const reader = demoReader();
    const { data: demo } = await reader
      .from("files")
      .select("storage_path, session_id")
      .eq("id", fileId)
      .single();
    if (demo?.session_id === DEMO_SESSION_ID) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      if (isRateLimited(`demo-page:${ip}`)) {
        return NextResponse.json({ error: "slow down" }, { status: 429 });
      }
      file = demo;
      storage = reader.storage;
    }
  }
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await storage
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
