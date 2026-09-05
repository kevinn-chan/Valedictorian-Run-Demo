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

// Every Gemini rung busy -> the OpenAI rescue rung answers (skipped without a key).
if (process.env.OPENAI_API_KEY) {
  const rescued = await generateText({
    model: chain(["gemini-3.8-flash"]),
    prompt: "Reply with the single word: ok",
    maxRetries: 0,
  });
  assert.match(rescued.response.modelId, /gpt/, "expected the OpenAI rescue rung to answer");
}

// Vision chain opts out of the rescue rung, so an exhausted Gemini must throw.
await assert.rejects(
  generateText({ model: chain(["gemini-3.8-flash"], false), prompt: "hi", maxRetries: 0 }),
  "vision chain must not silently fall through to OpenAI"
);

console.log("llm.check: ok —", busy.text.trim());
