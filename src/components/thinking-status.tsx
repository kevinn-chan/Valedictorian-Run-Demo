"use client";

import { useEffect, useState } from "react";

// Grounded answers take 20-40s before the first token (corpus context plus
// figure images). One static "Reading…" line for that long reads as a hang,
// so the message moves on as the wait grows.
const STAGES: [number, string][] = [
  [0, "Reading the notes…"],
  [8, "Pulling the relevant pages and figures…"],
  [20, "Writing a cited answer. Long ones can take up to a minute…"],
];

export function ThinkingStatus({ first = STAGES[0][1] }: { first?: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const label = secs < STAGES[1][0] ? first : [...STAGES].reverse().find(([at]) => secs >= at)![1];
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
      {label}
      {secs >= 5 && <span className="tabular-nums opacity-70">{secs}s</span>}
    </p>
  );
}
