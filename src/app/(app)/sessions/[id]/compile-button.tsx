"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// `recompile` = the file already compiled; re-running it pulls it through the
// latest ingest prompt (the ingest route deletes this file's old chunks/wiki
// first, so it's replace-in-place). Confirm since it discards current notes.
export function CompileButton({
  fileId,
  recompile = false,
}: {
  fileId: string;
  recompile?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Compiling a deck can legitimately run for minutes (see the Vercel ceiling
  // note in uploader.tsx). A disabled label that never changes reads as frozen
  // to someone who has just handed over a semester of coursework, so the wait
  // says what it is doing and how long it has been at it.
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [busy]);

  // Not a fake progress bar: each line is a real stage of the ingest route, in
  // the order it runs. No percentage, because we genuinely do not know one.
  const STAGES = [
    "Reading the pages",
    "Pulling out topics",
    "Writing the digest",
    "Stamping citations",
  ];
  const stage = STAGES[Math.min(Math.floor(elapsed / 20), STAGES.length - 1)];

  async function run() {
    if (
      recompile &&
      !confirm("Recompile this file? Its wiki digest and topics get regenerated from the latest prompt.")
    )
      return;
    startedAt.current = Date.now();
    setElapsed(0);
    setBusy(true);
    setErr(null);
    router.refresh(); // show "processing" chip
    const res = await fetch(`/api/ingest/${fileId}`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErr(body?.error ?? `compile failed (${res.status})`);
    }
    setBusy(false);
    router.refresh();
  }

  const label = recompile
    ? busy
      ? "Recompiling…"
      : "Recompile"
    : busy
      ? "Compiling…"
      : "Compile";

  return (
    <span className="flex items-center gap-2">
      {busy && (
        <span
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {stage}
          <span className="tabular-nums opacity-70">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </span>
      )}
      {err && (
        <span className="max-w-[28rem] truncate text-xs text-red-600 dark:text-red-400" title={err}>
          {err}
        </span>
      )}
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex min-h-6 items-center text-xs font-medium text-primary hover:underline disabled:opacity-50"
      >
        {label}
      </button>
    </span>
  );
}
