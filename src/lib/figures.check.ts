// Runnable self-check for the figure→topic resolver. Run: `node src/lib/figures.check.ts`
import assert from "node:assert";
import { resolveFigureTopic } from "./figures.ts";

const topics = [
  { slug: "vectors", pages: [10, 11, 12] },
  { slug: "matrices", pages: [20, 21] },
];

// 1. explicit slug hint wins → full wiki slug
assert.equal(
  resolveFigureTopic(topics, "abc12345", { page: 99, topic_slug: "matrices" }),
  "abc12345-matrices"
);
// 2. no/invalid hint → fall back to the topic whose pages cover the figure page
assert.equal(
  resolveFigureTopic(topics, "abc12345", { page: 11 }),
  "abc12345-vectors"
);
assert.equal(
  resolveFigureTopic(topics, "abc12345", { page: 11, topic_slug: "nope" }),
  "abc12345-vectors"
);
// 3. no hint and page not in any topic → null (still stored, just unpinned)
assert.equal(resolveFigureTopic(topics, "abc12345", { page: 500 }), null);

console.log("figures.check: all assertions passed");
