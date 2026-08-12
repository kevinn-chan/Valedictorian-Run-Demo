"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudyPlanForm({ initialFocus, hasPlan }: { initialFocus: string; hasPlan: boolean }) {
  const router = useRouter();
  const [focus, setFocus] = useState(initialFocus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/study-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focus }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "Plan generation failed");
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={generate} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="This week's priority (optional) — e.g. cramming for Computer Organization"
          className="min-w-64 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Planning…" : hasPlan ? "Regenerate week" : "Generate week"}
        </button>
      </div>
      {busy && (
        <p className="text-xs text-muted-foreground">
          Interleaving your courses by exam date and mastery gaps — up to a minute.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
