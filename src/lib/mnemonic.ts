import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "./llm.ts";

// Display-only — no DB write. One call per stuck card (only offered after
// grading "Again"), not per review, so cost stays low.
export async function generateMnemonic(
  supabase: SupabaseClient,
  cardId: string
): Promise<string> {
  const { data: card } = await supabase
    .from("cards")
    .select("front, back")
    .eq("id", cardId)
    .single();
  if (!card) throw new Error("Card not found");

  const { text } = await generateText({
    model: llm(),
    prompt: `A student keeps forgetting this flashcard:

Q: ${card.front}
A: ${card.back}

Give them one short, memorable mnemonic, analogy, or memory-palace trick to lock in the answer. 1-3 sentences, no preamble.`,
  });
  return text.trim();
}
