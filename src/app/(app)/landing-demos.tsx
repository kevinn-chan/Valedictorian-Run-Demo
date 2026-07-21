"use client";

import { useState } from "react";
import { Check, RotateCw, X } from "lucide-react";

// Interactive product demo: a real cue card from a real compiled deck.
export function FlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      aria-label={flipped ? "Show question" : "Reveal answer"}
      className="group h-56 w-full cursor-pointer [perspective:1200px]"
    >
      <span
        className={`relative block h-full w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <span className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-rose-200 bg-white p-6 text-left shadow-[0_10px_36px_-12px_rgba(190,18,60,0.25)] [backface-visibility:hidden]">
          <span className="text-sm leading-relaxed text-rose-950">
            What are the two types of transmission errors at the Data Link
            Layer?
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-500">
            <RotateCw className="size-3.5 transition-transform duration-300 group-hover:rotate-45" />
            tap to flip
          </span>
        </span>
        <span className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-rose-600 p-6 text-left shadow-[0_10px_36px_-12px_rgba(190,18,60,0.4)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-sm leading-relaxed text-white">
            Lost frames — never arrive at all — and damaged frames, received
            with bits in error.
          </span>
          <span className="text-xs font-medium text-rose-200">
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
  const done = picked !== null;
  return (
    <div className="flex h-56 flex-col rounded-3xl border border-rose-200 bg-white p-6 shadow-[0_10px_36px_-12px_rgba(190,18,60,0.25)]">
      <p className="text-sm leading-snug text-rose-950">
        Max window size for Selective-Reject ARQ with k-bit sequence numbers?
      </p>
      <div className="mt-3 space-y-1.5">
        {OPTIONS.map((o, i) => {
          const state = !done
            ? "idle"
            : o.correct
              ? "right"
              : picked === i
                ? "wrong"
                : "dim";
          return (
            <button
              key={o.label}
              disabled={done}
              onClick={() => setPicked(i)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-1.5 text-left text-sm transition-all duration-200 ${
                state === "idle"
                  ? "border-rose-200 text-rose-950 hover:-translate-y-0.5 hover:border-rose-400"
                  : state === "right"
                    ? "border-green-500 bg-green-50 font-medium text-green-800"
                    : state === "wrong"
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-rose-100 text-rose-300"
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
        className={`mt-auto pt-2 text-xs transition-opacity duration-300 ${
          done ? "opacity-100" : "opacity-0"
        } text-rose-500`}
      >
        The window halves so old frames can&apos;t masquerade as new ones —
        p. 28.
      </p>
    </div>
  );
}
