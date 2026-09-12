"use client";

import { useState } from "react";
import { Check, RotateCw, X } from "lucide-react";

// Interactive product demo: a real cue card from a real compiled deck.
export function FlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      aria-expanded={flipped}
      className="group h-56 w-full cursor-pointer [perspective:1200px]"
    >
      <span
        className={`relative block h-full w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <span aria-hidden={flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-border bg-card p-6 text-left [backface-visibility:hidden]" style={{ boxShadow: "var(--shadow-soft)" }}>
          <span className="text-sm leading-relaxed text-foreground">
            What are the two types of transmission errors at the Data Link
            Layer?
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RotateCw className="size-3.5 transition-transform duration-300 group-hover:rotate-45" />
            tap to flip
          </span>
        </span>
        <span aria-hidden={!flipped} className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-primary p-6 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ boxShadow: "var(--shadow-soft)" }}>
          <span className="text-sm leading-relaxed text-primary-foreground">
            Lost frames — never arrive at all — and damaged frames, received
            with bits in error.
          </span>
          <span className="text-xs font-medium text-primary-foreground/85">
            straight from p. 2 of the deck
          </span>
        </span>
      </span>
    </button>
  );
}

// One real mock-exam question with instant, page-cited feedback.
const OPTIONS = [
  { label: "2^k − 1", correct: false },
  { label: "2^(k−1)", correct: true },
  { label: "2^k", correct: false },
];

export function MiniQuiz() {
  const [picked, setPicked] = useState<number | null>(null);
  // A wrong answer used to disable every option permanently: the section that
  // exists to build confidence handed you a miniature of the exam you are
  // afraid of and then bolted the door. Wrong answers stay open, and the
  // explanation is held back until it is an explanation rather than a spoiler.
  const solved = picked !== null && OPTIONS[picked].correct;
  const done = picked !== null;
  return (
    <div className="flex min-h-56 flex-col rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <p className="text-sm leading-snug text-foreground">
        Max window size for Selective-Reject ARQ with k-bit sequence numbers?
      </p>
      <div className="mt-3 space-y-1.5">
        {OPTIONS.map((o, i) => {
          const state = solved
            ? o.correct
              ? "right"
              : "dim"
            : picked === i
              ? "wrong"
              : "idle";
          return (
            <button
              key={o.label}
              disabled={solved}
              onClick={() => setPicked(i)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-1.5 text-left text-sm transition-all duration-200 ${
                state === "idle"
                  ? "border-border text-foreground hover:-translate-y-0.5 hover:border-primary/50"
                  : state === "right"
                    ? "border-green-600 bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                    : state === "wrong"
                      ? "border-red-600 bg-red-500/10 text-red-700 dark:text-red-400"
                      : "border-border text-muted-foreground"
              }`}
            >
              {o.label}
              {state === "right" && <Check className="size-4" />}
              {state === "wrong" && <X className="size-4" />}
            </button>
          );
        })}
      </div>
      <p
        aria-hidden={!done}
        aria-live="polite"
        className={`mt-auto pt-2 text-xs transition-opacity duration-300 ${
          done ? "visible opacity-100" : "invisible opacity-0"
        } text-muted-foreground`}
      >
        {solved
          ? "The window halves so old frames can't masquerade as new ones — p. 28."
          : "Not that one. Have another go."}
      </p>
    </div>
  );
}
