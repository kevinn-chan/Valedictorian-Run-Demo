"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CardsButton({
  sessionId,
  hasCards,
}: {
  sessionId: string;
  hasCards: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (
      hasCards &&
      !confirm("Regenerating replaces the deck and resets review progress. Continue?")
    )
      return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cards/${sessionId}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "failed");
    }
    router.refresh();
  }

  return (
    <span>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        {busy ? "Generating cards…" : hasCards ? "Regenerate cards" : "Generate cue cards"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
