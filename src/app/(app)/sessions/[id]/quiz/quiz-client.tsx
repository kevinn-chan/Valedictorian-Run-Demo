"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordExam } from "../../../actions";

interface Q {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  page: number;
}

interface Attempt {
  score: number;
  total: number;
  taken_at: string;
}

export function QuizClient({
  sessionId,
  history,
}: {
  sessionId: string;
  history: Attempt[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    setSubmitted(false);
    setPicked({});
    const res = await fetch(`/api/quiz/${sessionId}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "quiz generation failed");
      return;
    }
    const j = await res.json();
    setQuestions(j.questions);
  }

  const best = history.length
    ? Math.max(...history.map((h) => h.score / h.total))
    : 0;

  if (!questions) {
    return (
      <div className="mt-10">
        <p className="text-sm text-muted-foreground">
          A fresh 10-question mock exam, generated from your materials every
          time — recall, mechanisms, and calculations, each answer cited.
        </p>
        <button
          onClick={start}
          disabled={busy}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Writing your exam…" : "Start mock exam"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {history.length > 0 && (
          <section className="mt-8 card-soft p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">Your attempts</h2>
              <span className="text-xs text-muted-foreground">
                best {Math.round(best * 100)}%
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {h.score}/{h.total}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.taken_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  const allAnswered = Object.keys(picked).length === questions.length;

  return (
    <div className="mt-8 space-y-8">
      {submitted && (
        <div className="rounded-lg border p-4 text-sm">
          <span className="font-semibold">
            {score}/{questions.length}
          </span>{" "}
          — {score >= 8 ? "exam-ready on this material." : score >= 5 ? "solid — review the misses below." : "worth another pass through the wiki before exam day."}
          <button
            onClick={start}
            disabled={busy}
            className="ml-3 text-xs underline"
          >
            {busy ? "generating…" : "new exam"}
          </button>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i}>
          <p className="text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          <div className="mt-2 space-y-1">
            {q.options.map((opt, j) => {
              const chosen = picked[i] === j;
              const correct = submitted && j === q.answer;
              const wrong = submitted && chosen && j !== q.answer;
              return (
                <button
                  key={j}
                  disabled={submitted}
                  onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                    correct
                      ? "border-green-600 bg-green-500/10"
                      : wrong
                        ? "border-red-600 bg-red-500/10"
                        : chosen
                          ? "border-primary"
                          : "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="mt-2 text-xs text-muted-foreground">
              {q.explanation}{" "}
              <span className="text-muted-foreground">(p. {q.page})</span>
            </p>
          )}
        </div>
      ))}

      {!submitted && (
        <button
          onClick={() => {
            setSubmitted(true);
            recordExam(sessionId, score, questions.length).then(() =>
              router.refresh()
            );
          }}
          disabled={!allAnswered}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {allAnswered
            ? "Submit"
            : `Answer all questions (${Object.keys(picked).length}/${questions.length})`}
        </button>
      )}
    </div>
  );
}
