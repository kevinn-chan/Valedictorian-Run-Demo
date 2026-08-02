// Read-only verification of the three roadmap features against real data.
// Run from project root: node scripts/verify-roadmap.mjs
// Uses the service role (mimics an authed client sans RLS) — mutates nothing.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// mirror of src/lib/ingest.ts pickTopicSlug (kept inline to avoid the heavy
// ingest import chain: mupdf/sharp/ai).
function pickTopicSlug(page, topics) {
  if (page == null) return null;
  const m = topics.filter((t) => (t.pages ?? []).includes(page));
  if (!m.length) return null;
  return m.sort((a, b) => (a.pages?.length ?? 0) - (b.pages?.length ?? 0))[0].slug;
}

// ---------- 1. Cross-session lexical search ----------
console.log("== 1. Cross-session search ==");
const term = process.argv[2] ?? "data";
const { data: hits, error: sErr } = await admin
  .from("chunks")
  .select("session_id, file_id, page_from, page_to, text, files(name), sessions(title)")
  .textSearch("tsv", term, { type: "websearch" })
  .limit(50);
if (sErr) console.log("  ERROR", sErr.message);
else {
  const sessions = new Set(hits.map((h) => h.session_id));
  console.log(`  query "${term}": ${hits.length} hits across ${sessions.size} session(s)`);
  for (const h of hits.slice(0, 3))
    console.log(
      `   · [${h.sessions?.title}] ${h.files?.name} p.${h.page_from} — ${h.text.slice(0, 60).replace(/\n/g, " ")}…`
    );
  console.log(
    hits.length && sessions.size >= 1 ? "  PASS: joins + FTS return grouped, source-linkable hits" : "  (no hits — try another term arg)"
  );
}

// ---------- 2. Recompile-safe re-tagging (what-if, read-only) ----------
console.log("\n== 2. Recompile-safe re-tagging (what-if on real orphans) ==");
const { data: sessions } = await admin.from("sessions").select("id, title");
let anyOrphans = false;
for (const s of sessions ?? []) {
  const [{ data: topics }, { data: cards }] = await Promise.all([
    admin.from("wiki_pages").select("slug, source_refs").eq("session_id", s.id).eq("kind", "topic"),
    admin.from("cards").select("topic_slug, source_ref").eq("session_id", s.id),
  ]);
  const topicSlugs = new Set((topics ?? []).map((t) => t.slug));
  const orphans = (cards ?? []).filter((c) => c.topic_slug && !topicSlugs.has(c.topic_slug));
  if (!orphans.length) continue;
  anyOrphans = true;
  // group current topics by fileTag, with their pages arrays
  const byTag = {};
  for (const t of topics ?? []) {
    const tag = t.slug.slice(0, 8);
    (byTag[tag] ??= []).push({ slug: t.slug, pages: t.source_refs?.pages ?? [] });
  }
  let rescued = 0, hadPage = 0;
  for (const c of orphans) {
    const page = c.source_ref?.page;
    if (page != null) hadPage++;
    const tag = (c.topic_slug ?? "").slice(0, 8);
    if (pickTopicSlug(page, byTag[tag] ?? [])) rescued++;
  }
  console.log(
    `  [${s.title}] orphans=${orphans.length}, have source page=${hadPage}, retag would rescue=${rescued}`
  );
}
if (!anyOrphans) console.log("  (no orphaned cards in any session right now)");

// ---------- 3. Image occlusion (data availability) ----------
console.log("\n== 3. Image occlusion (usable where figures exist) ==");
for (const s of sessions ?? []) {
  const { count } = await admin
    .from("figures")
    .select("*", { count: "exact", head: true })
    .eq("session_id", s.id);
  const { count: occ } = await admin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("session_id", s.id)
    .contains("source_ref", { kind: "occlusion" });
  if (count) console.log(`  [${s.title}] figures=${count}, existing occlusion cards=${occ ?? 0}`);
}
console.log("  (occlusion authoring is available on any session with figures ≥ 1)");
