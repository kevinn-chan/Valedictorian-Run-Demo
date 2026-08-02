import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOcclusionCards, type Region } from "@/lib/occlusion";

// Create image-occlusion cards from regions drawn on a figure. RLS scopes the
// figure lookup to the caller's own sessions, so ownership needs no extra check
// beyond confirming the figure belongs to the session in the URL.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { figureId, regions } = (await request.json()) as {
    figureId?: string;
    regions?: Region[];
  };
  if (!figureId || !Array.isArray(regions)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: fig } = await supabase
    .from("figures")
    .select("id, session_id, topic_slug, caption")
    .eq("id", figureId)
    .single();
  if (!fig || fig.session_id !== sessionId) {
    return NextResponse.json({ error: "figure not found" }, { status: 404 });
  }

  const rows = buildOcclusionCards(
    sessionId,
    figureId,
    (fig.topic_slug as string | null) ?? null,
    (fig.caption as string | null) ?? null,
    regions
  );
  if (!rows.length) {
    return NextResponse.json({ error: "no valid regions" }, { status: 400 });
  }

  const { error } = await supabase.from("cards").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: rows.length });
}
