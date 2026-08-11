"use client";

import { useState } from "react";

import { SHARED_PASSWORD_KEY } from "@/lib/shared-password";

// Two-step sign-in: password first, then pick a profile — never both on screen
// at once. The password stays in a controlled field and is submitted (as a hidden
// input) together with the chosen profile index to /api/profile-login, so the
// server contract is unchanged and the password is never persisted between steps.
export function LoginForm({
  profiles,
  hadError,
}: {
  profiles: { name: string }[];
  hadError: boolean;
}) {
  const [step, setStep] = useState<"password" | "profile">("password");
  const [password, setPassword] = useState("");

  return (
    <>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {step === "password" ? "Sign in" : "Who's studying?"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === "password"
          ? "Enter the shared password to continue."
          : "Pick your profile."}
      </p>

      <form
        action="/api/profile-login"
        method="post"
        className="mt-8"
        // Hand the shared password to this tab so the sidebar can re-submit it
        // for a one-click profile switch. sessionStorage (not localStorage) —
        // it survives the redirect to "/" and dies with the tab.
        onSubmit={() => {
          if (password) sessionStorage.setItem(SHARED_PASSWORD_KEY, password);
        }}
      >
        {step === "password" ? (
          <>
            <input
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) {
                  e.preventDefault();
                  setStep("profile");
                }
              }}
              placeholder="Shared password"
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-center text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
            />
            {hadError && (
              <p className="mt-3 text-sm text-red-600">
                Wrong password — try again.
              </p>
            )}
            <button
              type="button"
              disabled={!password}
              onClick={() => setStep("profile")}
              className="mt-6 h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="password" value={password} />
            <div className="flex items-start justify-center gap-8">
              {profiles.map((p, i) => (
                <button
                  key={i}
                  name="profile"
                  value={i}
                  type="submit"
                  className="group flex w-28 cursor-pointer flex-col items-center gap-3"
                >
                  <span
                    className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-3xl font-semibold text-primary-foreground transition duration-200 group-hover:-translate-y-1 group-hover:ring-4 group-hover:ring-primary/30 group-active:scale-95"
                    style={{ boxShadow: "var(--shadow-soft-hover)" }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground transition group-hover:text-foreground">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("password")}
              className="mt-8 text-xs text-muted-foreground transition hover:text-primary"
            >
              ← Use a different password
            </button>
          </>
        )}
      </form>
    </>
  );
}
