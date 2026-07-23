// Self-check for the analytics logic. Run: `node src/lib/analytics.check.ts`
import assert from "node:assert";
import {
  topicMastery,
  rankByWeakness,
  examTrend,
  UNGROUPED_SLUG,
  type CardStat,
} from "./analytics.ts";

const past = "2000-01-01T00:00:00.000Z"; // always "due"
const future = "2999-01-01T00:00:00.000Z";
const card = (o: Partial<CardStat>): CardStat => ({
  topic_slug: "t",
  reps: 0,
  lapses: 0,
  ease: 2.5,
  due_at: future,
  ...o,
});

const topics = [
  { slug: "weak", title: "Weak" },
  { slug: "solid", title: "Solid" },
  { slug: "fresh", title: "Fresh" },
  { slug: "empty", title: "Empty" }, // no cards → dropped
];
const cards: CardStat[] = [
  // weak: reviewed, low mastery, lapses, one due now
  card({ topic_slug: "weak", reps: 0, lapses: 3, ease: 1.8, due_at: past }),
  card({ topic_slug: "weak", reps: 1, lapses: 1, ease: 2.0 }),
  // solid: both mastered
  card({ topic_slug: "solid", reps: 3, ease: 2.6 }),
  card({ topic_slug: "solid", reps: 2, ease: 2.5 }),
  // fresh: never reviewed
  card({ topic_slug: "fresh" }),
];

const m = topicMastery(cards, topics);
assert.equal(m.length, 3, "empty topic dropped");
const by = Object.fromEntries(m.map((r) => [r.slug, r]));
assert.equal(by.weak.status, "weak");
assert.equal(by.weak.lapses, 4);
assert.equal(by.weak.dueNow, 1);
assert.equal(by.solid.status, "solid");
assert.equal(by.solid.masteryPct, 1);
assert.equal(by.fresh.status, "unstudied");
assert.equal(by.fresh.avgEase, null);

const ranked = rankByWeakness(m).map((r) => r.slug);
assert.deepEqual(ranked, ["weak", "fresh", "solid"], "weak → unstudied → solid");

// Orphaned cards (topic_slug matches no topic, e.g. after a recompile drifted
// the slugs) must be bucketed under Ungrouped, not silently dropped.
const orphanCards: CardStat[] = [
  card({ topic_slug: "gone-1", reps: 3 }),
  card({ topic_slug: "gone-2", reps: 0, lapses: 1 }),
  card({ topic_slug: null }),
];
const om = topicMastery(orphanCards, topics);
const ung = om.find((r) => r.slug === UNGROUPED_SLUG);
assert.ok(ung, "orphaned cards produce an Ungrouped bucket");
assert.equal(ung.cards, 3, "all orphaned cards counted");
assert.equal(ung.title, "Ungrouped");
// No bucket when every card matches a topic.
assert.ok(
  !topicMastery(cards, topics).some((r) => r.slug === UNGROUPED_SLUG),
  "no Ungrouped bucket when all cards match"
);

const trend = examTrend([
  { score: 5, total: 10, taken_at: "2026-01-02T00:00:00Z" },
  { score: 9, total: 10, taken_at: "2026-01-05T00:00:00Z" },
  { score: 7, total: 10, taken_at: "2026-01-03T00:00:00Z" },
]);
assert.equal(trend.count, 3);
assert.equal(trend.latest?.score, 9, "latest = most recent by date (Jan 5)");
assert.equal(trend.best, 0.9);
assert.equal(trend.pts[0].at, "2026-01-02T00:00:00Z", "sorted oldest first");

console.log("analytics.check: all assertions passed");
