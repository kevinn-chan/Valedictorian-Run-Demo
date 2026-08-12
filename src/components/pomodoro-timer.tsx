"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;
const STORAGE_KEY = "pomodoro";

type Phase = "work" | "break";
type Stored = {
  phase: Phase;
  secondsLeft: number;
  running: boolean;
  cycles: number;
  lastTick: number;
};

function load(): Stored {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const s = JSON.parse(raw) as Stored;
    // Account for time passed while the tab was closed/backgrounded.
    if (s.running) {
      const elapsed = Math.floor((Date.now() - s.lastTick) / 1000);
      s.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
    }
    return s;
  } catch {
    return { phase: "work", secondsLeft: WORK_SECS, running: false, cycles: 0, lastTick: Date.now() };
  }
}

function save(s: Stored) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, lastTick: Date.now() }));
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Standalone 25/5 timer, sessionStorage-only — no server round-trip, no
// coupling to review grading. Counts completed work cycles, not cards
// reviewed (the roadmap's "cards per session" needs review-client wiring;
// scoped out as a separate ask).
export function PomodoroTimer() {
  const [state, setState] = useState<Stored | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    if (!state?.running) return;
    const id = setInterval(() => {
      setState((prev) => {
        if (!prev || !prev.running) return prev;
        if (prev.secondsLeft <= 1) {
          const next: Stored =
            prev.phase === "work"
              ? { phase: "break", secondsLeft: BREAK_SECS, running: true, cycles: prev.cycles + 1, lastTick: Date.now() }
              : { phase: "work", secondsLeft: WORK_SECS, running: true, cycles: prev.cycles, lastTick: Date.now() };
          save(next);
          return next;
        }
        const next = { ...prev, secondsLeft: prev.secondsLeft - 1 };
        save(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state?.running]);

  if (!state) return null;

  function toggle() {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, running: !prev.running };
      save(next);
      return next;
    });
  }

  function reset() {
    const next: Stored = { phase: "work", secondsLeft: WORK_SECS, running: false, cycles: state?.cycles ?? 0, lastTick: Date.now() };
    save(next);
    setState(next);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground/70">
      <Timer className="size-[18px] shrink-0" />
      <span className="flex-1 tabular-nums">
        {fmt(state.secondsLeft)}
        <span className="ml-1.5 text-xs text-muted-foreground">
          {state.phase === "work" ? "focus" : "break"}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">{state.cycles}</span>
      <button
        onClick={toggle}
        aria-label={state.running ? "Pause" : "Start"}
        className="rounded-lg p-1 hover:bg-secondary hover:text-foreground"
      >
        {state.running ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <button
        onClick={reset}
        aria-label="Reset"
        className="rounded-lg p-1 hover:bg-secondary hover:text-foreground"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}
