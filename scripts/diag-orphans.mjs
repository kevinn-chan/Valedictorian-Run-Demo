// Diagnostic: compare a session's card topic_slugs against its wiki topic slugs
// to prove/measure the recompile-orphans-cards bug. Run: node scripts/diag-orphans.mjs <sessionId>
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const sessionId = process.argv[2];
if (!sessionId) {
  console.log("usage: node scripts/diag-orphans.mjs <sessionId>");
  process.exit(1);
}

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

const { data: topics } = await admin
  .from("wiki_pages")
  .select("slug, title")
  .eq("session_id", sessionId)
  .eq("kind", "topic");
const { data: cards } = await admin
  .from("cards")
  .select("topic_slug")
  .eq("session_id", sessionId);

const topicSlugs = new Set((topics ?? []).map((t) => t.slug));
const cardSlugs = [...new Set((cards ?? []).map((c) => c.topic_slug))];
const matched = cardSlugs.filter((s) => topicSlugs.has(s));
const orphaned = cardSlugs.filter((s) => !topicSlugs.has(s));
const orphanCardCount = (cards ?? []).filter(
  (c) => !topicSlugs.has(c.topic_slug)
).length;

console.log(`session ${sessionId}`);
console.log(`  topics: ${topics?.length ?? 0}, cards: ${cards?.length ?? 0}`);
console.log(`  distinct card slugs: ${cardSlugs.length} (matched ${matched.length}, orphaned ${orphaned.length})`);
console.log(`  orphaned cards: ${orphanCardCount} / ${cards?.length ?? 0}`);
console.log(`  sample topic slugs:`, (topics ?? []).slice(0, 4).map((t) => t.slug));
console.log(`  sample card slugs :`, cardSlugs.slice(0, 4));
