// Verify the ungrouped-bucket fix against real session data. Runs the actual
// topicMastery() over a session's live cards + topics. Run: node scripts/verify-fix.mjs <sessionId>
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { topicMastery } from "../src/lib/analytics.ts";

const sessionId = process.argv[2];
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const [{ data: cards }, { data: topics }] = await Promise.all([
  admin.from("cards").select("topic_slug, reps, lapses, ease, due_at").eq("session_id", sessionId),
  admin.from("wiki_pages").select("slug, title").eq("session_id", sessionId).eq("kind", "topic"),
]);

const rows = topicMastery(cards ?? [], topics ?? []);
console.log(`session ${sessionId}: ${cards?.length ?? 0} cards, ${topics?.length ?? 0} topics`);
console.log(`rows (${rows.length}):`);
for (const r of rows) console.log(`  ${r.title.padEnd(45)} cards=${r.cards} status=${r.status}`);
const counted = rows.reduce((n, r) => n + r.cards, 0);
console.log(`total cards shown in Progress: ${counted} / ${cards?.length ?? 0}`);
