import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fileSlug } from "@/lib/export";

// Anki's plaintext importer splits on tabs and newlines, so both have to go.
function cell(s: string | null) {
  return (s ?? "")
    .replace(/\t/g, " ")
    .replace(/\r\n|\r|\n/g, "<br>")
    .trim();
}

// Downloads the session's cards as an Anki-importable TSV (front<TAB>back).
// Ownership comes from RLS on the user's own client.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("id", sessionId)
    .single();
  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: cards } = await supabase
    .from("cards")
    .select("front, back, topic_slug")
    .eq("session_id", sessionId)
    .order("topic_slug");

  const text = (cards ?? [])
    .map((c) => `${cell(c.front)}\t${cell(c.back)}\n`)
    .join("");

  return new Response(text, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileSlug(session.title)}-cards.tsv"`,
    },
  });
}
