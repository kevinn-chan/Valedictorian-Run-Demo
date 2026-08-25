// Run: node src/lib/answer.check.ts
// Guards the prompt-cache invariant: the system prompt must be byte-identical
// for every question in a session, or the corpus is re-read (and re-billed) on
// each turn. Also pins the deterministic chunk ordering the cache depends on.
import assert from "node:assert";
import { buildContext } from "./answer.ts";

const CHUNKS = [
  { page_from: 2, page_to: 2, text: "beta", files: { name: "a.pdf" }, id: "b" },
  { page_from: 1, page_to: 1, text: "alpha", files: { name: "a.pdf" }, id: "a" },
  { page_from: 1, page_to: 1, text: "alpha-two", files: { name: "a.pdf" }, id: "z" },
];

// Minimal thenable stand-in for the supabase query builder: records the ordering
// calls, applies them, and resolves to rows.
function fakeSupabase(rows: typeof CHUNKS) {
  const q = {
    _orders: [] as string[],
    select: () => q,
    eq: () => q,
    limit: () => q,
    textSearch: () => q,
    order(col: string) {
      q._orders.push(col);
      return q;
    },
    then(resolve: (v: { data: unknown; error: null }) => void) {
      const sorted = [...rows].sort((a, b) => {
        for (const col of q._orders) {
          const x = (a as Record<string, unknown>)[col] as string | number;
          const y = (b as Record<string, unknown>)[col] as string | number;
          if (x < y) return -1;
          if (x > y) return 1;
        }
        return 0;
      });
      resolve({ data: sorted, error: null });
    },
  };
  return { from: () => q } as never;
}

const a = await buildContext(fakeSupabase(CHUNKS), "s1", "what is alpha?");
const b = await buildContext(fakeSupabase(CHUNKS), "s1", "explain beta in detail");
assert.equal(a.tier, "A");
assert.equal(
  a.system,
  b.system,
  "system prompt varies by question — prompt caching will miss on the whole corpus"
);

// Ties on page_from must not reorder between calls (shuffled input, same output).
const shuffled = [CHUNKS[2], CHUNKS[0], CHUNKS[1]];
const c = await buildContext(fakeSupabase(shuffled), "s1", "q");
assert.equal(c.system, a.system, "chunk order is not deterministic");

// And the order is actually page-major.
assert.ok(
  a.system.indexOf("alpha\n") < a.system.indexOf("alpha-two") &&
    a.system.indexOf("alpha-two") < a.system.indexOf("beta"),
  "chunks are not ordered by page"
);

console.log("answer.check: ok");
