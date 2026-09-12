"use client";

import { useState } from "react";

export function LoginForm({
  profiles,
  hadError,
}: {
  profiles: string[];
  hadError: boolean;
}) {
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(hadError ? "That link expired or was already used. Try again." : null);

  // The server resolves the index to an address and sends the link — the
  // client never sees an email (see /api/send-link).
  async function sendLink(index: number, name: string) {
    setSending(true);
    setError(null);
    const res = await fetch("/api/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: index }),
    });
    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    setSending(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error ?? "Couldn't send the link. Try again.");
    } else {
      setSent(name);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{sent}</span>'s email.
          Click it to continue.
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-8 text-xs text-muted-foreground transition hover:text-primary"
        >
          ← Pick a different profile
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Who's studying?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick your profile and we'll send a sign-in link to your email.
      </p>

      <div className="mt-8 flex items-start justify-center gap-8">
        {profiles.map((name, index) => (
          <button
            key={name}
            type="button"
            disabled={sending}
            onClick={() => sendLink(index, name)}
            className="group flex w-28 cursor-pointer flex-col items-center gap-3 disabled:opacity-50"
          >
            <span
              className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-3xl font-semibold text-primary-foreground transition duration-200 group-hover:-translate-y-1 group-hover:ring-4 group-hover:ring-primary/30 group-active:scale-95"
              style={{ boxShadow: "var(--shadow-soft-hover)" }}
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-muted-foreground transition group-hover:text-foreground">
              {name}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {sending && <p className="mt-6 text-sm text-muted-foreground">Sending link…</p>}
    </>
  );
}
