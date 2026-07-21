# Security model

**Read this before deploying Valedictorian Run anywhere the public can reach it.**

This project was built as a **private study app for two trusted people** sharing one URL.
That shaped the auth model, which is intentionally minimal. The data layer is solid; the
front door is wide open by design.

## TL;DR

| Area | Status |
|---|---|
| Data isolation (Row-Level Security) | ✅ Solid — every table is scoped to `auth.uid()`; users cannot read each other's data, even by direct URL. |
| Secret handling | ✅ Solid — only the Supabase URL + anon key reach the client; the service-role key and LLM keys are server-only; `.env*` is gitignored. |
| **Authentication** | ⚠️ **None, by design** — the login screen is a click-to-enter profile picker. **Knowing the URL grants full access to a profile.** |
| Rate limiting / cost controls | ⚠️ None — a shared LLM key with no per-user quota. |

## Why login is "insecure" on purpose

The login screen shows named profiles (e.g. "Kevin", "Tina"). Clicking one calls
`/api/profile-login`, which mints a one-time Supabase magic-link token **server-side** and
exchanges it for a session — **no password, no email round-trip, no proof of identity.**

For two people sharing a private link to their own non-confidential course notes, this is a
reasonable, friction-free trade-off. **On a public URL it means any visitor can click a
profile and become that user.** Do not expose it as-is.

## What is genuinely safe here

- **Row-Level Security** is enabled on every table with `owns_session()` / `user_id =
  auth.uid()` policies, plus owner-scoped Storage policies. This was verified: a second user
  gets a 404 when hitting another user's session URL directly. If you add real auth, this
  isolation already scales to unlimited users with no further work.
- **Secrets**: `NEXT_PUBLIC_*` exposes only the Supabase URL and the anon key (both safe
  under RLS). `SUPABASE_SERVICE_ROLE_KEY` and the LLM keys are used only in server routes.
  No secret is committed — `.env*` is gitignored (`.env.example` holds placeholders only).

## What to change before ANY public deployment

1. **Replace the profile picker with real authentication.** Swap `/api/profile-login` + the
   profile buttons for Supabase Auth (Google OAuth is the least friction, or email +
   password). Because RLS keys off `auth.uid()`, new users are isolated automatically.
2. **Remove the 2-user allowlist** — the `enforce_email_allowlist` trigger in the migration
   and the `ALLOWED_EMAILS` check in `src/lib/supabase/proxy.ts` — or convert it to a
   waitlist. Otherwise no one but the seeded emails can sign up.
3. **Don't share one LLM key with strangers.** The Gemini free tier is ~20 requests/minute
   and it's *your* key/bill. Either let each user bring their own API key, or add strict
   per-user daily quotas and a hard spend cap.
4. **Add per-user resource limits.** Lower the 50 MB upload cap, and limit sessions, files,
   and compiles per user — compile/quiz/card generation are the expensive calls.
5. **Add a Terms of Service / privacy note.** Users upload their own (often copyrighted)
   course material and their data is stored; make the handling explicit.

Until at least items 1–3 are done, keep the deployment private (an unlisted URL shared only
with people you trust), or run it locally.

## Reporting

Found a vulnerability in the code itself (not the intentional auth model above)? Please open
a GitHub issue, or contact the repository owner privately for anything sensitive.
