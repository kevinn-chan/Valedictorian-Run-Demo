# Security model

**Read this before deploying Valedictorian Run anywhere the public can reach it.**

This project was built as a **private study app for a tiny, trusted group** (two people)
sharing one URL. That shaped the auth model. The data layer is solid; the front door is an
email allowlist plus magic links, and the people on it are trusted with each other's
profiles.

## TL;DR

| Area | Status |
|---|---|
| Data isolation (Row-Level Security) | ✅ Solid. Every table is scoped to `auth.uid()`; users cannot read each other's data, even by direct URL. |
| Secret handling | ✅ Solid. Only the Supabase URL and publishable/anon key reach the browser; the service-role key and LLM keys are server-only; `.env*` is gitignored and `.env.example` holds placeholders only. |
| **Authentication** | 🔸 **Allowlisted magic links.** Only emails on the allowlist can sign in, each via a link sent to that inbox. But any signed-in profile can **switch into any other profile instantly**, with no second email. Fine for a small trusted group, not for open public signup. |
| Rate limiting / cost controls | 🔸 Basic. Login links: 5 per minute per IP and 3 per hour per profile. `/demo` chat: 5 per minute per IP and 120 per hour overall. Both are counted in Postgres (migrations 0012–0013), so limits hold across serverless instances. The main app still shares one LLM key with no per-user quota. |

## The login model

The login screen lists the profiles from `PROFILES` (names only; emails never reach the
browser). Clicking one POSTs the profile's **index** to `/api/send-link`, which looks up the
email on the server and sends a Supabase **magic link** to that inbox. Clicking the link
signs you in. A stranger who finds the URL can trigger an email to a listed person, within
the rate limits above, but can't sign in without access to that inbox.

Three checks gate who gets a session:

1. **`enforce_email_allowlist` trigger** (migration 0001): Supabase refuses to create an
   account for any email not in `public.allowed_emails`.
2. **`src/lib/supabase/proxy.ts`**: every signed-in request is redirected to `/login` unless
   the email is in `ALLOWED_EMAILS` or `PROFILES`.
3. **Redirect URL allowlist** in Supabase Auth: magic links only complete on URLs you listed.

**Profile switching is a trust decision.** `/api/switch-profile` lets any signed-in user
become any other profile immediately: it uses the service role to mint a sign-in token for
the target, with no email. The two users in the original design trust each other and wanted
one-click switching. It means **everyone on the allowlist can act as everyone else on it**.
If that's not true for your group, delete `src/app/api/switch-profile/` and the
`ProfileSwitcher` (`src/components/profile-switcher.tsx`, rendered from
`src/components/sidebar.tsx`).

The dashboard's "buddy" card also reads the other profile's summary stats through the
service role, for the same reason.

## The public `/demo`

When `DEMO_SESSION_ID` is set, `/demo` is open to anyone, read-only:

- It serves that one session's wiki, cards and figures through a service-role reader, and
  renders pages of that session's source PDFs for citation previews. No other session is
  reachable this way; the figure and page-render routes check the session id.
- Its chat calls your LLM (preferring `DEMO_GEMINI_KEY`), rate limited as above.
- No writes and no account access.

Only point it at material you have the right to publish.

## What is genuinely safe here

- **Row-Level Security** is enabled on every table with `owns_session()` / `user_id =
  auth.uid()` policies, plus owner-scoped Storage policies. A second user gets a 404 hitting
  another user's session URL directly. This isolation already scales to unlimited users once
  you add per-user signup.
- **Database functions** are not callable by signed-out visitors (migrations 0009–0011), and
  the rate-limit table has RLS on with no policies: only the server's service role can use it.
- **Secrets**: `NEXT_PUBLIC_*` exposes only the Supabase URL and the publishable/anon key,
  both safe under RLS. `SUPABASE_SERVICE_ROLE_KEY` and the LLM keys are used only in server
  routes. No secret is committed.

## What to change before an OPEN public (multi-user) deployment

1. **Remove instant profile switching.** Delete `src/app/api/switch-profile/` and
   `ProfileSwitcher`, so a session is only ever the person who clicked their own link.
2. **Move from fixed profiles to per-user signup.** Replace the `PROFILES` picker with a
   normal email field or OAuth (Google is the least friction). Because RLS keys off
   `auth.uid()`, new users are isolated automatically.
3. **Remove the allowlist**, or turn it into a waitlist: the `enforce_email_allowlist` trigger
   in migration 0001 and the allowlist check in `src/lib/supabase/proxy.ts`. Otherwise no one
   but the listed emails can sign up.
4. **Don't share one LLM key with strangers.** It's your key and your bill. Let each user
   bring their own API key, or add per-user daily quotas and a hard spend cap.
5. **Add per-user resource limits.** Lower the 50 MB upload cap, and cap sessions, files and
   compiles per user; compile, quiz and card generation are the expensive calls.
6. **Use your own email sender** (Supabase → Authentication → Emails → SMTP) and consider a
   CAPTCHA on sign-in, which Supabase supports natively.
7. **Add a Terms of Service / privacy note.** Users upload their own (often copyrighted)
   course material and it's stored; make the handling explicit.

For a small, trusted group the current model is enough. For an open public app, do at least
1–4 first.

## Reporting

Found a vulnerability in the code itself (not the intentional trusted-group model above)?
Please open a GitHub issue, or contact the repository owner privately for anything sensitive.
