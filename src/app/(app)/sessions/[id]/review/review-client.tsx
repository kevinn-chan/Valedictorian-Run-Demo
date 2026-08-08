"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { schedule, type Grade } from "@/lib/srs";

interface Card {
  id: string;
  front: string;
  back: string;
  topic_slug: string | null;
  source_ref: {
    page?: number;
    kind?: string;
    figureId?: string;
    rect?: { x: number; y: number; w: number; h: number };
  } | null;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  session_title?: string | null; // shown only in the cross-session "due today" queue
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
  sessionId?: string; // omitted in the cross-session "due today" queue
  cards: Card[];
}) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [grades, setGrades] = useState({ again: 0, good: 0, easy: 0 });
  const startTime = useRef(Date.now());
  const [swipeX, setSwipeX] = useState(0);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const swipedRef = useRef(false);
  const [lastGraded, setLastGraded] = useState<{
    card: Card;
    grade: "again" | "good" | "easy";
    prev: { interval_days: number; ease: number; reps: number; lapses: number; due_at: string };
  } | null>(null);
  // Hide-all-but-one: cache sibling occlusion rects per figure
  const siblingCache = useRef<Record<string, { cardId: string; rect: { x: number; y: number; w: number; h: number } }[]>>({});
  const [siblings, setSiblings] = useState<{ cardId: string; rect: { x: number; y: number; w: number; h: number } }[]>([]);
  const card = queue[0];

  useEffect(() => {
    if (!card?.source_ref || card.source_ref.kind !== "occlusion" || !card.source_ref.figureId) {
      setSiblings([]);
      return;
    }
    const fid = card.source_ref.figureId;
    if (siblingCache.current[fid]) {
      setSiblings(siblingCache.current[fid]);
      return;
    }
    fetch(`/api/occlusion-siblings?figureId=${fid}`)
      .then((r) => r.json())
      .then((d) => {
        siblingCache.current[fid] = d.rects ?? [];
        setSiblings(d.rects ?? []);
      })
      .catch(() => setSiblings([]));
  }, [card]);

  const grade = useCallback(
    async (g: "again" | "good" | "easy") => {
      if (!card || !flipped) return;
      setFlipped(false);
      setReviewed((n) => n + 1);
      setGrades((prev) => ({ ...prev, [g]: prev[g] + 1 }));
      setQueue((q) => (g === "again" ? [...q.slice(1), card] : q.slice(1)));
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      });
      const data = await res.json();
      if (data.prev) {
        setLastGraded({ card, grade: g, prev: data.prev });
      }
    },
    [card, flipped]
  );

  const undo = useCallback(async () => {
    if (!lastGraded) return;
    const { card: undoneCard, grade: undoneGrade, prev } = lastGraded;
    setGrades((g) => ({ ...g, [undoneGrade]: Math.max(0, g[undoneGrade] - 1) }));
    setLastGraded(null);
    setFlipped(false);
    setReviewed((n) => Math.max(0, n - 1));
    // Put card back at the front; if it was "again" it's also at the end — remove that copy
    setQueue((q) =>
      undoneGrade === "again"
        ? [undoneCard, ...q.filter((c) => c.id !== undoneCard.id)]
        : [undoneCard, ...q]
    );
    fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo", cardId: undoneCard.id, prev }),
    });
  }, [lastGraded]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "1") grade("again");
      else if (e.key === "2") grade("good");
      else if (e.key === "3") grade("easy");
      else if (e.key === "u" || e.key === "U") undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade, undo]);

  const total = reviewed + queue.length;

  const SWIPE_THRESHOLD = 60;

  function onPointerDown(e: React.PointerEvent) {
    if (!flipped) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) setSwipeX(dx);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    setSwipeX(0);
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      swipedRef.current = true;
      grade(dx < 0 ? "again" : "good");
    }
  }
  function onPointerCancel() {
    pointerStart.current = null;
    setSwipeX(0);
  }

  if (!card) {
    const elapsed = Math.round((Date.now() - startTime.current) / 60000);
    const total = grades.again + grades.good + grades.easy;
    return (
      <div className="mt-12 flex flex-col items-center text-center animate-slide-up">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          {total ? "Session complete" : "Nothing due"}
        </h2>
        {total > 0 && (
          <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-red-500/10 px-3 py-2.5">
              <p className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">{grades.again}</p>
              <p className="text-xs text-muted-foreground">Again</p>
            </div>
            <div className="rounded-xl bg-primary/10 px-3 py-2.5">
              <p className="text-lg font-semibold tabular-nums text-primary">{grades.good}</p>
              <p className="text-xs text-muted-foreground">Good</p>
            </div>
            <div className="rounded-xl bg-green-500/10 px-3 py-2.5">
              <p className="text-lg font-semibold tabular-nums text-green-700 dark:text-green-400">{grades.easy}</p>
              <p className="text-xs text-muted-foreground">Easy</p>
            </div>
          </div>
        )}
        {total > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {total} card{total === 1 ? "" : "s"} in {elapsed < 1 ? "under a minute" : `${elapsed} min`}
          </p>
        )}
        <Link
          href={sessionId ? `/sessions/${sessionId}` : "/"}
          className="btn-squish mt-8 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          {sessionId ? "← Back to session" : "← Home"}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
          <span>{reviewed} reviewed</span>
          <span>{queue.length} remaining</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full w-full rounded-full bg-primary"
            style={{
              clipPath: `inset(0 ${100 - (total > 0 ? (reviewed / total) * 100 : 0)}% 0 0 round 999px)`,
              transition: "clip-path 500ms cubic-bezier(0.23,1,0.32,1)",
            }}
          />
        </div>
      </div>

      {/* min-height keeps the grade row still when the answer expands — the
          buttons must not slide out from under the cursor mid-review. */}
      <button
        onClick={() => {
          if (swipedRef.current) { swipedRef.current = false; return; }
          setFlipped((f) => !f);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        aria-expanded={flipped}
        className="relative flex min-h-[18rem] w-full cursor-pointer flex-col rounded-2xl border bg-card p-8 text-left transition-colors hover:border-primary/30 sm:p-10 touch-pan-y"
        style={{
          boxShadow: "var(--shadow-soft)",
          transform: swipeX ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX ? "none" : "transform 200ms ease-out",
        }}
      >
        {swipeX !== 0 && (
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl ${swipeX < 0 ? "bg-red-500/10" : "bg-primary/10"}`}
          />
        )}
        {card.session_title && (
          <p className="mb-3 text-xs font-medium text-primary/80">
            {card.session_title}
          </p>
        )}
        <p className="text-lg leading-relaxed">{card.front}</p>

        {card.source_ref?.kind === "occlusion" &&
        card.source_ref.figureId &&
        card.source_ref.rect ? (
          <div className="relative mt-4 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/figure/${card.source_ref.figureId}`}
              alt="occlusion figure"
              className="max-h-[50vh] w-auto rounded-lg border"
            />
            {/* Hide-all-but-one: mask every sibling region so adjacent labels can't be read */}
            {siblings
              .filter((s) => s.cardId !== card.id)
              .map((s) => (
                <div
                  key={s.cardId}
                  className="absolute rounded bg-primary"
                  style={{
                    left: `${s.rect.x * 100}%`,
                    top: `${s.rect.y * 100}%`,
                    width: `${s.rect.w * 100}%`,
                    height: `${s.rect.h * 100}%`,
                  }}
                />
              ))}
            {/* The tested region: solid mask → ring on flip */}
            <div
              className={`absolute rounded ${
                flipped ? "ring-2 ring-primary" : "bg-primary"
              }`}
              style={{
                left: `${card.source_ref.rect.x * 100}%`,
                top: `${card.source_ref.rect.y * 100}%`,
                width: `${card.source_ref.rect.w * 100}%`,
                height: `${card.source_ref.rect.h * 100}%`,
              }}
            />
          </div>
        ) : null}

        {flipped && (
          <div className="animate-slide-up mt-auto border-t pt-6">
            <p className="text-[15px] leading-relaxed text-foreground/90">
              {card.back}
            </p>
            {card.source_ref?.page && (
              <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                p. {card.source_ref.page}
              </p>
            )}
          </div>
        )}
      </button>

      {flipped ? (
        <div className="mt-3 flex gap-2 animate-slide-up">
          <button
            onClick={() => grade("again")}
            className="btn-squish flex-1 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-500/20"
          >
            Again
            <span className="ml-1.5 text-xs font-normal text-red-600/70">
              1 · {intervalLabel(card, "again")}
            </span>
          </button>
          <button
            onClick={() => grade("good")}
            className="btn-squish flex-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Good
            <span className="ml-1.5 text-xs font-normal text-primary/70">
              2 · {intervalLabel(card, "good")}
            </span>
          </button>
          <button
            onClick={() => grade("easy")}
            className="btn-squish flex-1 rounded-lg border border-green-200 bg-green-500/10 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-500/20"
          >
            Easy
            <span className="ml-1.5 text-xs font-normal text-green-600/70">
              3 · {intervalLabel(card, "easy")}
            </span>
          </button>
        </div>
      ) : (
        // Same height as the grade row so revealing never shifts the layout.
        <div className="mt-3 flex h-[42px] items-center justify-center">
          {lastGraded ? (
            <button
              onClick={undo}
              className="btn-squish rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              Undo{" "}
              <kbd className="ml-1 rounded border bg-secondary px-1 py-0.5 font-sans text-[10px]">
                u
              </kbd>
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">
                press{" "}
                <kbd className="mx-1 rounded border bg-secondary px-1.5 py-0.5 font-sans text-[11px] font-medium">
                  space
                </kbd>{" "}
                to reveal
              </span>
              <span className="sm:hidden">tap to reveal · swipe to grade</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
