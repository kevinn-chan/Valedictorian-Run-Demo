import { createClient } from "@supabase/supabase-js";

// The single session served publicly (read-only) at /demo. Point it at a
// compiled session whose contents are safe to show the world.
// Unset = /demo is off.
export const DEMO_SESSION_ID = process.env.DEMO_SESSION_ID;

// Service-role reader: the demo intentionally bypasses RLS to serve one public
// session to anonymous visitors. Server-only — never import into a client file.
export function demoReader() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Real counts for the one public demo course. Used on the landing page so the
 * hero can point at something true instead of an illustration: these are the
 * artifacts the pipeline actually produced, not a claim about them.
 *
 * Count-only queries (head: true) — no rows cross the wire. Returns null when
 * the demo isn't configured or the read fails, and the caller renders nothing;
 * a marketing line is never worth failing a page render over.
 */
export async function demoCorpusStats() {
  if (!DEMO_SESSION_ID) return null;
  const sb = demoReader();
  const count = (table: string, extra?: [string, string]) => {
    let q = sb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("session_id", DEMO_SESSION_ID);
    if (extra) q = q.eq(extra[0], extra[1]);
    return q;
  };
  try {
    const [topics, files, cards] = await Promise.all([
      count("wiki_pages", ["kind", "topic"]),
      count("wiki_pages", ["kind", "file_digest"]),
      count("cards"),
    ]);
    if (topics.error || files.error || cards.error) return null;
    return {
      topics: topics.count ?? 0,
      files: files.count ?? 0,
      cards: cards.count ?? 0,
    };
  } catch {
    return null;
  }
}
