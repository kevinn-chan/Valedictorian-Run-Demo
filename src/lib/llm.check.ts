// Runnable self-check for the free-tier fallback chain:
//   node --env-file=.env.local src/lib/llm.check.ts
// gemini-3.8-flash is the quota-starved model that broke compiles; heading a
// chain with it proves a busy model hands off instead of failing the request.
import assert from "node:assert";
import { generateText } from "ai";
import { chain } from "./llm.ts";

const busy = await generateText({
  model: chain(["gemini-3.8-flash", "gemini-3.7-flash"]),
  prompt: "Reply with the single word: ok",
  maxRetries: 0,
});
assert.ok(busy.text.trim().length > 0, "chain returned nothing after fallback");

// A bad model id is our bug, not a busy provider — it must surface, not retry.
await assert.rejects(
  generateText({
    model: chain(["gemini-not-a-real-model", "gemini-3.7-flash"]),
    prompt: "hi",
    maxRetries: 0,
  }),
  "a 404 model id should propagate instead of falling through"
);

console.log("llm.check: ok —", busy.text.trim());
