import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fileSlug } from "@/lib/export";

// Reading order: the overview pages first, then the topics, then the raw
// per-file digests at the back like an appendix.
const KIND_ORDER: Record<string, number> = {
  index: 0,
  glossary: 1,
  formula_sheet: 2,
  topic: 3,
  file_digest: 4,
};

// Downloads the whole wiki as one Markdown file. Ownership comes from RLS on
// the user's own client — a session they don't own simply isn't there.
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

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("kind, title, markdown")
    .eq("session_id", sessionId)
    .order("title");

  const ordered = [...(pages ?? [])].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
  );

  const text = ordered
    .map((p) => `## ${p.title}\n\n${p.markdown ?? ""}\n\n---\n\n`)
    .join("");

  return new Response(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileSlug(session.title)}-wiki.md"`,
    },
  });
}
