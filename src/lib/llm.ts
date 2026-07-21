import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Gemini free tier is primary; OpenAI Tier 3 is break-glass.
// Flipping LLM_PROVIDER=openai is the entire failover.
export function llm() {
  return process.env.LLM_PROVIDER === "openai"
    ? openai("gpt-5-mini")
    : google("gemini-flash-latest"); // alias tracks current stable Flash — survives model retirements
}
