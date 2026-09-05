import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

// Gemini free tier is primary; OpenAI is the last rung of every chain below
// (and LLM_PROVIDER=openai forces it outright).

// Pinned model IDs, NOT `gemini-flash-latest`: that alias silently rolled onto
// gemini-3.8-flash, whose free tier allows 20 requests — compiles just failed.
// Free-tier quota is per-model, so when the head of a chain is rate-limited or
// overloaded its siblings usually still answer. Order = best first.
const FLASH = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-lite-latest"];
const LITE = ["gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-3.7-flash"];

// Paid-but-tiny: ~50 requests/day on this key, so it sits at the END of a chain
// as insurance for the day Gemini's whole free tier is unhappy — never as a
// primary. Costs ~$0.008 a call against prepaid credits.
const RESCUE = "gpt-5-mini";

// 429 (quota) and 503/5xx (overloaded) are the two ways the free tier says "not
// me, try someone else". A 400 is our bug and must not silently hit 3 models.
const isBusy = (e: unknown) => {
  const s = (e as { statusCode?: number })?.statusCode;
  return s === 429 || s === 408 || (typeof s === "number" && s >= 500);
};

// ponytail: falls back on the *initial* call only — a stream that dies mid-body
// is not retried, since the caller has already sent bytes to the browser.
// `rescue` is opt-out for vision work: GPT is markedly worse than Gemini at the
// bounding-box coordinates occlusion cards need, so a silent swap there would
// quietly degrade the feature rather than save it.
export function chain(ids: string[], rescue = true) {
  const rest = ids.slice(1).map((id) => () => google(id));
  if (rescue && process.env.OPENAI_API_KEY) rest.push(() => openai(RESCUE));

  const next = async <T>(
    call: (m: ReturnType<typeof rest[number]>) => Promise<T>,
    first: unknown
  ): Promise<T> => {
    for (const model of rest) {
      try {
        return await call(model());
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
          return next((m) => Promise.resolve(m.doGenerate(params)), e);
        }
      },
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (e) {
          if (!isBusy(e)) throw e;
          return next((m) => Promise.resolve(m.doStream(params)), e);
        }
      },
    },
  });
}

export function llm() {
  return process.env.LLM_PROVIDER === "openai" ? openai(RESCUE) : chain(FLASH);
}

// For the cheap, high-volume paths (cards, mnemonics, study plans). Flash-Lite
// has its own free-tier bucket, so these stop eating the compile/chat budget.
export function llmLite() {
  return process.env.LLM_PROVIDER === "openai" ? openai(RESCUE) : chain(LITE);
}

// Occlusion's ✨ Suggest. Gemini-only, on purpose — see `rescue` above.
export function llmVision() {
  return chain(FLASH, false);
}
