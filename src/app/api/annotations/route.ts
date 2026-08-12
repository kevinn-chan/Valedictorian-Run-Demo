import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { sessionId, wikiSlug, quote, note } = await request.json();
  if (!sessionId || !wikiSlug || !quote?.trim() || !note?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      session_id: sessionId,
      wiki_slug: wikiSlug,
      quote: quote.trim().slice(0, 300),
      note: note.trim(),
    })
    .select("id, quote, note, created_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ note: data });
}
