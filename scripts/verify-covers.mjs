// Verifies the data path CardCover depends on: that `figures` rows exist, carry
// the columns the cards select, and that the first-per-session / first-per-topic
// grouping actually resolves to a cover. Read-only; service-role, so it mirrors
// what RLS would return for the owning user without needing a browser session.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Exactly the select the dashboard runs.
const { data: figures, error: fe } = await sb
  .from("figures")
  .select("id, session_id, topic_slug, page, caption")
  .order("page");
if (fe) throw new Error("figures select failed: " + fe.message);

const { data: sessions } = await sb.from("sessions").select("id, title");
const { data: topics } = await sb
  .from("wiki_pages")
  .select("slug, session_id")
  .eq("kind", "topic");

const coverBySession = new Map();
for (const f of figures ?? [])
  if (!coverBySession.has(f.session_id)) coverBySession.set(f.session_id, f);

const coverByTopic = new Map();
for (const f of figures ?? [])
  if (f.topic_slug && !coverByTopic.has(f.topic_slug))
    coverByTopic.set(f.topic_slug, f);

console.log(`figures rows        : ${figures.length}`);
console.log(`sessions            : ${sessions.length}`);
console.log(`topics              : ${topics.length}`);
console.log(`sessions with cover : ${coverBySession.size}/${sessions.length}`);
console.log(`topics with cover   : ${coverByTopic.size}/${topics.length}`);

let bad = 0;
for (const [sid, f] of coverBySession) {
  const s = sessions.find((x) => x.id === sid);
  const okId = typeof f.id === "string" && f.id.length === 36;
  const okPage = Number.isInteger(f.page);
  if (!okId || !okPage) {
    console.log(`  BAD  ${s?.title}: id=${f.id} page=${f.page}`);
    bad++;
  } else {
    console.log(`  ok   ${s?.title} -> figure ${f.id.slice(0, 8)} p.${f.page}`);
  }
}

// Fallback path: every session with no figure must still have a usable title
// for the initials panel.
for (const s of sessions) {
  if (!coverBySession.has(s.id)) {
    const initials = s.title
      .split(/\s+/)
      .filter((w) => /[a-z0-9]/i.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
    console.log(`  ok   ${s.title} -> no figure, initials "${initials}"`);
    if (!initials) bad++;
  }
}

console.log(bad === 0 ? "\nPASS — cover data path sound" : `\nFAIL — ${bad} bad`);
process.exit(bad === 0 ? 0 : 1);
