"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopicCardControls({
  sessionId,
  topicSlug,
}: {
  sessionId: string;
  topicSlug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"more" | "harder" | null>(null);
  const [message, setMessage] = useState("");

  async function run(mode: "more" | "harder") {
    setBusy(mode);
    setMessage("");
    const res = await fetch(`/api/cards/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicSlug, mode }),
    });
    setBusy(null);
    const j = await res.json().catch(() => null);
    setMessage(res.ok ? `Added ${j?.count ?? 0} cards.` : (j?.error ?? "failed"));
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        onClick={() => run("more")}
        disabled={busy !== null}
        className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        {busy === "more" ? "Generating…" : "+ More cards"}
      </button>
      <button
        onClick={() => run("harder")}
        disabled={busy !== null}
        className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        {busy === "harder" ? "Generating…" : "+ Harder cards"}
      </button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
