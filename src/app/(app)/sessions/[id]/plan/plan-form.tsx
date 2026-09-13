"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanForm({
  sessionId,
  initialGoal,
  initialExamDate,
  hasPlan,
}: {
  sessionId: string;
  initialGoal: string;
  initialExamDate: string;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [examDate, setExamDate] = useState(initialExamDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/plan/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, examDate }),
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
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          aria-label="Goal"
          placeholder="Goal, e.g. confident on all ARQ protocols"
          className="min-w-64 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          required
          aria-label="Exam date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy
            ? "Planning…"
            : hasPlan
              ? "Regenerate plan"
              : "Generate plan"}
        </button>
      </div>
      {/* The plan route saves both onto the session, which drives the countdown
          on the session page — say so instead of changing them silently. */}
      <p className="text-xs text-muted-foreground">
        Generating also saves this goal and exam date to the session.
      </p>
      {busy && (
        <p className="text-xs text-muted-foreground">
          Building your schedule from the corpus wiki. This takes up to a minute.
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
