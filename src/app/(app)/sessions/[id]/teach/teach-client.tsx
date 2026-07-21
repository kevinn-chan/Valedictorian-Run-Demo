"use client";

import { useState } from "react";
import { Check, Circle, X } from "lucide-react";

interface Topic {
  slug: string;
  title: string;
}

interface Grade {
  topicTitle: string;
  score: number;
  verdict: string;
  strengths: string[];
  corrections: { claim: string; fix: string; page: number }[];
  missing: { point: string; page: number }[];
}

export function TeachClient({
  sessionId,
  topics,
}: {
  sessionId: string;
  topics: Topic[];
}) {
  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setGrade(null);
    const res = await fetch(`/api/teachback/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicSlug, explanation }),
    });
    setBusy(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "grading failed");
      return;
    }
    setGrade(j);
  }

  const scoreColor = (s: number) =>
    s >= 80
      ? "text-green-600 dark:text-green-400"
      : s >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={submit} className="card-soft p-5">
        <label htmlFor="topic" className="text-sm font-medium">
          Topic
        </label>
        <select
          id="topic"
          value={topicSlug}
          onChange={(e) => setTopicSlug(e.target.value)}
          className="mt-1.5 block w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary/50"
        >
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>

        <label htmlFor="explanation" className="mt-4 block text-sm font-medium">
          Teach it back — no peeking
        </label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={7}
          placeholder="Explain it from memory like you're teaching a friend: what problem does it solve, how does the mechanism work, what are the formulas and edge cases?"
          className="mt-1.5 block w-full resize-y rounded-lg border bg-card px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || explanation.trim().length < 40}
            className="btn-squish rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Grading against your materials…" : "Grade my explanation"}
          </button>
          {explanation.trim().length > 0 && explanation.trim().length < 40 && (
            <span className="text-xs text-muted-foreground">
              keep going — a few sentences at least
            </span>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {grade && (
        <section data-grade className="card-soft p-5">
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-semibold ${scoreColor(grade.score)}`}>
              {grade.score}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-1 text-sm">{grade.verdict}</p>

          {grade.strengths.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium">You nailed</h3>
              <ul className="mt-2 space-y-1.5">
                {grade.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grade.corrections.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium">Fix these</h3>
              <ul className="mt-2 space-y-2.5">
                {grade.corrections.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <X className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>
                      <span className="text-muted-foreground line-through">
                        {c.claim}
                      </span>{" "}
                      → {c.fix}{" "}
                      <span className="text-xs text-muted-foreground">
                        (p. {c.page})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {grade.missing.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium">You left out</h3>
              <ul className="mt-2 space-y-1.5">
                {grade.missing.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <Circle className="mt-1 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      {m.point}{" "}
                      <span className="text-xs text-muted-foreground">
                        (p. {m.page})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setGrade(null);
              setExplanation("");
            }}
            className="mt-6 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:text-primary"
          >
            Try again
          </button>
        </section>
      )}
    </div>
  );
}
