"use client";

import { useState } from "react";

interface Card {
  front: string;
  back: string;
}

// Read-only, no persistence: flip and step through a handful of the demo
// session's real cards. No grading — there's nothing to grade without an
// account, this is "try the interaction," not a review session.
export function DemoFlashcards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];

  if (!card) return null;

  function next() {
    setFlipped(false);
    setI((n) => (n + 1) % cards.length);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
        <span>Sample flashcard</span>
        <span>
          {i + 1} / {cards.length}
        </span>
      </div>
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-expanded={flipped}
        className="relative mt-2 flex min-h-[12rem] w-full cursor-pointer flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary/50"
      >
        <p className="text-base leading-relaxed">{card.front}</p>
        {flipped && (
          <div className="animate-slide-up mt-auto border-t border-border pt-4">
            <p className="text-sm leading-relaxed text-foreground/90">{card.back}</p>
          </div>
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-2">
        {!flipped ? (
          <p className="text-xs text-muted-foreground">tap the card to reveal</p>
        ) : (
          <button
            onClick={next}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition hover:-translate-y-0.5 active:scale-95"
          >
            Next card →
          </button>
        )}
      </div>
    </div>
  );
}
