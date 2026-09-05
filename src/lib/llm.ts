import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

// Gemini free tier is primary; OpenAI Tier 3 is break-glass.
// Flipping LLM_PROVIDER=openai is the entire failover.

// Pinned model IDs, NOT `gemini-flash-latest`: that alias silently rolled onto
// gemini-3.8-flash, whose free tier allows 20 requests — compiles just failed.
// Free-tier quota is per-model, so when the head of a chain is rate-limited or
// overloaded its siblings usually still answer. Order = best first.
const FLASH = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-lite-latest"];
const LITE = ["gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-3.7-flash"];

// 429 (quota) and 503/5xx (overloaded) are the two ways the free tier says "not
// me, try someone else". A 400 is our bug and must not silently hit 3 models.
const isBusy = (e: unknown) => {
  const s = (e as { statusCode?: number })?.statusCode;
  return s === 429 || s === 408 || (typeof s === "number" && s >= 500);
};

// ponytail: falls back on the *initial* call only — a stream that dies mid-body
// is not retried, since the caller has already sent bytes to the browser.
export function chain(ids: string[]) {
  const rest = ids.slice(1);
  const next = async <T>(call: (id: string) => Promise<T>, first: unknown): Promise<T> => {
    for (const id of rest) {
      try {
        return await call(id);
      } catch (e) {
        if (!isBusy(e)) throw e;
      }
    }
    throw first;
  };

  return wrapLanguageModel({
    model: google(ids[0]),
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate();
        } catch (e) {
          if (!isBusy(e)) throw e;
          return next((id) => Promise.resolve(google(id).doGenerate(params)), e);
        }
      },
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (e) {
          if (!isBusy(e)) throw e;
          return next((id) => Promise.resolve(google(id).doStream(params)), e);
        }
      },
    },
  });
}

export function llm() {
  return process.env.LLM_PROVIDER === "openai" ? openai("gpt-5-mini") : chain(FLASH);
}

// For the cheap, high-volume paths (cards, mnemonics, study plans). Flash-Lite
// has its own free-tier bucket, so these stop eating the compile/chat budget.
export function llmLite() {
  return process.env.LLM_PROVIDER === "openai" ? openai("gpt-5-mini") : chain(LITE);
}
