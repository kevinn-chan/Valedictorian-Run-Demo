"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { schedule, type Grade } from "@/lib/srs";

interface Card {
  id: string;
  front: string;
  back: string;
  topic_slug: string | null;
  source_ref: { page?: number } | null;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
}

// "Good · 3d" style preview of where each grade sends the card
function intervalLabel(card: Card, g: Grade) {
  const next = schedule(card, g);
  return next.interval_days === 0 ? "10m" : `${next.interval_days}d`;
}

export function ReviewClient({
  sessionId,
  cards,
}: {
  sessionId: string;
  cards: Card[];
}) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const card = queue[0];

  const grade = useCallback(
    async (g: "again" | "good" | "easy") => {
      if (!card || !flipped) return;
      setFlipped(false);
      setReviewed((n) => n + 1);
      // "again" puts the card back at the end of this session's queue
      setQueue((q) => (g === "again" ? [...q.slice(1), card] : q.slice(1)));
      fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      });
    },
    [card, flipped]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "1") grade("again");
      else if (e.key === "2") grade("good");
      else if (e.key === "3") grade("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade]);

  if (!card) {
    return (
      <div className="mt-16 text-center">
        <h2 className="text-lg font-medium">
          {reviewed ? `Done — ${reviewed} cards reviewed.` : "Nothing due."}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Come back when the next cards fall due.
        </p>
        <Link
          href={`/sessions/${sessionId}`}
          className="mt-6 inline-block text-sm font-medium hover:underline"
        >
          ← Back to session
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="text-xs text-muted-foreground">
        {queue.length} to go · space = flip · 1 again · 2 good · 3 easy
      </p>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card-soft card-lift mt-4 w-full cursor-pointer p-10 text-left"
      >
        <p className="text-base leading-relaxed">{card.front}</p>
        {flipped && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-6 border-t pt-6 duration-300">
            <p className="text-sm leading-relaxed text-foreground/90">
              {card.back}
            </p>
            {card.source_ref?.page && (
              <p className="mt-3 text-xs text-muted-foreground">
                p. {card.source_ref.page}
              </p>
            )}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="mt-4 flex gap-2">
          {(
            [
              ["again", "Again", "1"],
              ["good", "Good", "2"],
              ["easy", "Easy", "3"],
            ] as const
          ).map(([g, label, key]) => (
            <button
              key={g}
              onClick={() => grade(g)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary"
            >
              {label}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {key} · {intervalLabel(card, g)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          tap the card or press space to reveal
        </p>
      )}
    </div>
  );
}
