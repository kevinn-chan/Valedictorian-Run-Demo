// Runnable self-check for the free-tier fallback chain:
//   node --env-file=.env.local src/lib/llm.check.ts
import assert from "node:assert";
import { generateText } from "ai";
import { chain, isBusy } from "./llm.ts";

// Classification is the part that must never drift: a busy provider is retried
// down the chain, our own bad request is not (retrying a 400 four times just
// burns four models' quota on the same broken call).
for (const status of [408, 429, 500, 502, 503]) {
  assert.equal(isBusy({ statusCode: status }), true, `${status} should fall through`);
}
for (const status of [400, 401, 403, 404, 422]) {
  assert.equal(isBusy({ statusCode: status }), false, `${status} should propagate`);
}
assert.equal(isBusy(new Error("no status")), false, "an unknown error is not 'busy'");

// Live: a chain headed by the quota-starved model still answers. Which rung
// serves depends on the day's quota, so assert only that one of them did —
// pinning a specific model here made the check pass or fail with the clock.
const rescued = await generateText({
  model: chain(["gemini-3.8-flash"]),
  prompt: "Reply with the single word: ok",
  maxRetries: 0,
});
assert.ok(rescued.text.trim().length > 0, "no rung of the chain answered");

// Live: a bad model id is our bug, so it must surface rather than quietly
// costing every model in the chain a request.
await assert.rejects(
  generateText({
    model: chain(["gemini-not-a-real-model"], false),
    prompt: "hi",
    maxRetries: 0,
  }),
  "a 404 model id should propagate instead of falling through"
);

console.log(`llm.check: ok — served by ${rescued.response.modelId}`);
