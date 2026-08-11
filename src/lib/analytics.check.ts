// Self-check for the analytics logic. Run: `node src/lib/analytics.check.ts`
import assert from "node:assert";
import {
  topicMastery,
  rankByWeakness,
  examTrend,
  sortByWeakness,
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

// sortByWeakness: weakest topic first, then highest-lapse within topic,
// ungrouped last. Also verifies same-slug topics in different sessions never
// get merged (Finding 2).
{
  const S = "session-a";
  const topics = [
    { session_id: S, slug: "weak", title: "Weak" },
    { session_id: S, slug: "strong", title: "Strong" },
  ];
  const allCards = [
    { session_id: S, topic_slug: "weak", reps: 0, lapses: 3, ease: 1.8, due_at: future },
    { session_id: S, topic_slug: "weak", reps: 0, lapses: 0, ease: 2.5, due_at: future },
    { session_id: S, topic_slug: "strong", reps: 3, lapses: 0, ease: 2.6, due_at: future },
    { session_id: S, topic_slug: "strong", reps: 2, lapses: 0, ease: 2.5, due_at: future },
  ];
  const due = [
    { id: "weak-hi", session_id: S, topic_slug: "weak", lapses: 5 },
    { id: "weak-lo", session_id: S, topic_slug: "weak", lapses: 1 },
    { id: "strong-1", session_id: S, topic_slug: "strong", lapses: 0 },
    { id: "ungrouped-1", session_id: S, topic_slug: "no-such-topic", lapses: 0 },
  ];
  const sorted = sortByWeakness(due, allCards, topics).map((c) => c.id);
  assert.deepEqual(
    sorted,
    ["weak-hi", "weak-lo", "strong-1", "ungrouped-1"],
    "weak topic first (tie-broken by lapses desc), ungrouped last"
  );
}

// Cross-session case: two sessions share a topic slug ("overview") with very
// different mastery. A due card from the weak session must sort as weak, not
// be masked by the strong session's same-named topic.
{
  const A = "session-a";
  const B = "session-b";
  const topics = [
    { session_id: A, slug: "overview", title: "Overview" },
    { session_id: B, slug: "overview", title: "Overview" },
  ];
  // Session A "overview": 90% mastery (9/10 mastered).
  const aCards = Array.from({ length: 10 }, (_, i) => ({
    session_id: A,
    topic_slug: "overview",
    reps: i < 9 ? 3 : 0,
    lapses: 0,
    ease: 2.5,
    due_at: future,
  }));
  // Session B "overview": 10% mastery (1/10 mastered).
  const bCards = Array.from({ length: 10 }, (_, i) => ({
    session_id: B,
    topic_slug: "overview",
    reps: i < 1 ? 3 : 0,
    lapses: 0,
    ease: 2.5,
    due_at: future,
  }));
  const due = [
    { id: "from-A", session_id: A, topic_slug: "overview", lapses: 0 },
    { id: "from-B", session_id: B, topic_slug: "overview", lapses: 0 },
  ];
  const sorted = sortByWeakness(due, [...aCards, ...bCards], topics).map(
    (c) => c.id
  );
  assert.deepEqual(
    sorted,
    ["from-B", "from-A"],
    "session B's weak 'overview' sorts before session A's strong same-named 'overview'"
  );
}

console.log("analytics.check: all assertions passed");
