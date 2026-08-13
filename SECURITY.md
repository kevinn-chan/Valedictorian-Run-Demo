# Security model

**Read this before deploying Valedictorian Run anywhere the public can reach it.**

This project was built as a **private study app for a tiny, trusted group** (two people)
sharing one URL. That shaped the auth model. The data layer is solid; the front door is a
single shared password.

## TL;DR

| Area | Status |
|---|---|
| Data isolation (Row-Level Security) | ✅ Solid — every table is scoped to `auth.uid()`; users cannot read each other's data, even by direct URL. |
| Secret handling | ✅ Solid — only the Supabase URL + anon key reach the client; the service-role key and LLM keys are server-only; `.env*` is gitignored. |
| **Authentication** | 🔸 **Shared-password gate** — real Supabase `signInWithPassword`, but both profiles share one password. Knowing the URL is no longer enough; fine for a small trusted group, not for open public signup. |
| Rate limiting / cost controls | 🔸 Basic — `/api/profile-login` is capped at 5 attempts/minute per IP. Still one shared LLM key; the public `/demo` prefers a separate `DEMO_GEMINI_KEY`, but the main app has no per-user quota. |

## The login model

The login screen takes **one shared password**, then shows named profiles ("Kevin",
"Tina"). Clicking a profile POSTs the profile's email + that password to
`/api/profile-login`, which runs real Supabase **`signInWithPassword`** and issues a normal
session. Without the password there is no session — a stranger who guesses the URL is stopped
at the door.

This is deliberately a **shared** secret: the two users trust each other and want to hop
between both profiles with one password. It is *not* multi-tenant public auth — everyone with
the password can sign into either seeded profile. For a public, open-signup app you'd move to
per-user accounts (see below); the data layer is already ready for it.

There is also a public, read-only **`/demo`** route (browse one sample course + a grounded
chat) that is intentionally open and serves a single `DEMO_SESSION_ID` via a service-role
reader — no writes, no account access.

## What is genuinely safe here

- **Row-Level Security** is enabled on every table with `owns_session()` / `user_id =
  auth.uid()` policies, plus owner-scoped Storage policies. Verified: a second user gets a
  404 hitting another user's session URL directly. This isolation already scales to unlimited
  users the moment you add per-user signup.
- **Secrets**: `NEXT_PUBLIC_*` exposes only the Supabase URL and the anon key (both safe under
  RLS). `SUPABASE_SERVICE_ROLE_KEY` and the LLM keys are used only in server routes. No secret
  is committed — `.env*` is gitignored (`.env.example` holds placeholders only).

## What to change before an OPEN public (multi-user) deployment

1. **Move from the shared password to per-user auth.** Swap the shared-password profile
   picker for Supabase Auth signup (Google OAuth is the least friction, or email + password).
   Because RLS keys off `auth.uid()`, new users are isolated automatically.
2. **Remove the allowlist** — the `enforce_email_allowlist` trigger in the migration and the
   `ALLOWED_EMAILS` check in `src/lib/supabase/proxy.ts` — or convert it to a waitlist.
   Otherwise no one but the seeded emails can sign up.
3. **Don't share one LLM key with strangers.** The Gemini free tier is ~20 requests/minute
   and it's *your* key/bill. Let each user bring their own API key, or add strict per-user
   daily quotas and a hard spend cap. (The demo already supports a separate `DEMO_GEMINI_KEY`.)
4. **Add per-user resource limits.** Lower the 50 MB upload cap, and cap sessions, files, and
   compiles per user — compile/quiz/card generation are the expensive calls.
5. **Add a Terms of Service / privacy note.** Users upload their own (often copyrighted)
   course material and it's stored; make the handling explicit.

For a small, trusted group the shared-password gate is enough. For an open public app, do at
least 1–3 first.

## Reporting

Found a vulnerability in the code itself (not the intentional shared-password model above)?
Please open a GitHub issue, or contact the repository owner privately for anything sensitive.
