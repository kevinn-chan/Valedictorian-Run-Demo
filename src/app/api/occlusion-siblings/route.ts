import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Returns all occlusion rects for a given figure so the review UI
// can mask every label, not just the one being tested.
export async function GET(request: NextRequest) {
  const figureId = request.nextUrl.searchParams.get("figureId");
  if (!figureId) {
    return NextResponse.json({ error: "missing figureId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("id, source_ref")
    .filter("source_ref->>kind", "eq", "occlusion")
    .filter("source_ref->>figureId", "eq", figureId);

  const rects = (data ?? []).map((c) => ({
    cardId: c.id,
    rect: (c.source_ref as { rect: { x: number; y: number; w: number; h: number } }).rect,
  }));

  return NextResponse.json({ rects });
}
