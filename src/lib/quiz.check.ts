// Self-check for quiz post-processing. Run: `node src/lib/quiz.check.ts`
import assert from "node:assert";
import { cleanQuestion, shuffleOptions, stripInlineCitations } from "./quiz.ts";

const q = { question: "Q", options: ["a", "b", "c", "d"], answer: 1, explanation: "e", page: 3 };

// The answer index follows the correct option wherever it lands.
for (let seed = 0; seed < 50; seed++) {
  let s = seed + 1;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out = shuffleOptions(q, rand);
  assert.equal(out.options[out.answer], "b");
  assert.deepEqual([...out.options].sort(), ["a", "b", "c", "d"]);
}

// Across many shuffles the correct option reaches every slot.
const slots = new Set<number>();
for (let i = 0; i < 200; i++) slots.add(shuffleOptions(q).answer);
assert.deepEqual([...slots].sort(), [0, 1, 2, 3]);

// Inline bracket citations go; the rest of the sentence survives.
assert.equal(
  stripInlineCitations("A residual lies above or below the line [MH3510_Chapter2.pdf p.5]."),
  "A residual lies above or below the line."
);
assert.equal(
  stripInlineCitations("Two sources [MH3510_Chapter2.pdf p.32, 33]. Wider."),
  "Two sources. Wider."
);
assert.equal(stripInlineCitations("No citation here [see note]."), "No citation here [see note].");

// Math cleanup runs on every field.
const cleaned = cleanQuestion({ ...q, question: "What is $\\beta_1$?", options: ["\\frac{1}{n}", "b", "c", "d"], answer: 0 }, () => 0);
assert.equal(cleaned.question, "What is β_1?");
assert.ok(cleaned.options.includes("1/n"));
assert.equal(cleaned.options[cleaned.answer], "1/n");

console.log("quiz.check: all assertions passed");
