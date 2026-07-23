"use client";

import { useState } from "react";

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
      <p className="mt-2 text-sm text-rose-900/70">
        {step === "password"
          ? "Enter the shared password to continue."
          : "Pick your profile."}
      </p>

      <form action="/api/profile-login" method="post" className="mt-8">
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
              className="h-11 w-full rounded-xl border border-rose-200 bg-white px-4 text-center text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
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
              className="mt-6 h-11 w-full rounded-xl bg-rose-600 text-sm font-medium text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
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
                  <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-rose-500 text-3xl font-semibold text-white shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)] transition duration-200 group-hover:-translate-y-1 group-hover:ring-4 group-hover:ring-rose-300/60 group-active:scale-95">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-rose-900/70 transition group-hover:text-rose-950">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("password")}
              className="mt-8 text-xs text-rose-900/50 transition hover:text-rose-700"
            >
              ← Use a different password
            </button>
          </>
        )}
      </form>
    </>
  );
}
