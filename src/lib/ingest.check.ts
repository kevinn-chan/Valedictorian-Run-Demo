// Self-check for recompile-safe card re-tagging. Run: `node src/lib/ingest.check.ts`
import assert from "node:assert";
import { pickTopicSlug, diffFigures } from "./ingest.ts";

const topics = [
  { slug: "abc-intro", pages: [1, 2, 3, 4, 5] }, // broad
  { slug: "abc-loops", pages: [3, 4] }, // overlaps intro on p.3-4, but narrower
  { slug: "abc-frames", pages: [10] },
];

// Page in exactly one topic → that topic.
assert.equal(pickTopicSlug(10, topics), "abc-frames");
// Page 1 only in the broad topic.
assert.equal(pickTopicSlug(1, topics), "abc-intro");
// Page 3 in both intro and loops → most specific (fewest pages) wins.
assert.equal(pickTopicSlug(3, topics), "abc-loops");
// No topic covers the page → leave the card where it is.
assert.equal(pickTopicSlug(99, topics), null);
// Missing page (older cards) → no remap.
assert.equal(pickTopicSlug(null, topics), null);
assert.equal(pickTopicSlug(undefined, topics), null);

// Figure-stable recompile check
const existing = [
  { id: "fig-1", page: 3, storage_path: "sess/fig_abc_p3.webp" },
  { id: "fig-2", page: 8, storage_path: "sess/fig_abc_p8.webp" },
];
const newPages = [3, 10];
const { toUpdate, toInsert, toDelete } = diffFigures(existing, newPages);

assert(toUpdate.length === 1 && toUpdate[0].id === "fig-1", "page 3 row survives");
assert(toInsert.length === 1 && toInsert[0] === 10, "page 10 is new");
assert(toDelete.length === 1 && toDelete[0].id === "fig-2", "page 8 removed");
console.log("  ✓ figure-stable recompile");

console.log("ingest.check: all assertions passed");
