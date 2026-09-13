# Cloud Setup — click-by-click

Three parts, in order: **Supabase → Gemini key → Vercel**. About 20 minutes.
Sign-in uses **magic links**: pick a profile, get a sign-in link by email, click it.

---

## Before you start: every value you'll replace

Nothing in this repo points at a real project, account or person. Everything below is a
placeholder, and the app won't work until you've swapped each one for your own.

| Placeholder | Where it appears | Replace with |
|---|---|---|
| `you@example.com`, `teammate@example.com` | `.env.example` (`ALLOWED_EMAILS`, `PROFILES`), step 1c SQL | The real email address of each person who will sign in |
| `You`, `Teammate` | `PROFILES` in `.env.example` | The names shown on the login screen |
| `https://YOUR-PROJECT.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (step 1f) |
| *(empty)* | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase keys (step 1f) |
| *(empty)* | `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini key (Part 2) |
| `YOUR-PROJECT-REF` | CLI commands in step 1b | The ID in your project URL (`https://YOUR-PROJECT-REF.supabase.co`) |
| `https://YOUR-APP.vercel.app` | Steps 1e and 3a | Your own Vercel deployment URL |
| *(empty, optional)* | `DEMO_SESSION_ID`, `DEMO_GEMINI_KEY`, `CRON_SECRET`, `OPENAI_API_KEY` | Only if you turn those features on (Part 4) |

> 🔒 **Secrets stay out of git.** Put real values only in `.env.local` (gitignored) and in
> Vercel's Environment Variables. Never edit real keys into `.env.example`, and never paste
> the **service role / secret key** anywhere public: it bypasses every security rule.

> ⚠️ **Keep three lists in sync.** A person can sign in only if their email is in **all
> three**: the `allowed_emails` table (step 1c), `ALLOWED_EMAILS`, and `PROFILES` (step 1g).
> Emails in `PROFILES` are also allowed automatically, so listing them in both env vars is
> harmless.

---

## Part 1 — Supabase (~10 min)

### 1a. Create the project

1. Go to **supabase.com** → sign in → **New project**.
2. Name: anything (e.g. `valedictorian-run`) · Database password: click **Generate** and save it in a password manager · Region: closest to you · Plan: **Free**.
3. Wait ~2 minutes until the project dashboard loads.

### 1b. Create the schema (run all 13 migrations, in order)

The files in `supabase/migrations/` build on each other, so **run them in numeric order and
don't skip any**. Pick one of two ways.

**Option A: SQL Editor (no install).** Left sidebar → **SQL Editor** → **New query**. For each
file, open it, select all, paste, **Run**:

| File | What it sets up |
|---|---|
| `0001_init.sql` | Tables, Row-Level Security, the sign-in allowlist, the `session-files` storage bucket and its policies |
| `0002_exam_results.sql` | Mock-exam history |
| `0003_figures.sql` | Figures captured from your PDFs |
| `0004_search_rank.sql` | Ranked full-text search |
| `0005_mastery_snapshots.sql` | Daily mastery history for progress charts |
| `0006_annotations.sql` | Margin notes on wiki topics |
| `0007_study_plans.sql` | The cross-course weekly plan |
| `0008_upload_restrictions.sql` | Upload size and file-type limits on the storage bucket |
| `0009_rls_hardening.sql` | Security and performance hardening |
| `0010_revoke_anon_execute.sql` | Stops signed-out visitors calling database functions |
| `0011_restore_owns_session_grant.sql` | Fix-up for 0009/0010. **Required**, or signed-in pages break |
| `0012_durable_rate_limits.sql` | Login and demo rate limits stored in the database |
| `0013_rate_limit_count_before_insert.sql` | Fix-up for 0012. **Required**, run it right after 0012 |

**Option B: Supabase CLI.** From the repo folder:

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF   # asks for the database password from 1a
npx supabase db push                               # applies every migration in order
```

✅ **Checkpoint:** run this in the SQL Editor. You should see `7 | 1 | true`:

```sql
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename in
    ('allowed_emails', 'exam_results', 'figures', 'mastery_snapshots',
     'annotations', 'study_plans', 'rate_limits'))            as tables_found,     -- expect 7
  (select count(*) from pg_proc where proname = 'check_rate_limit') as rate_limit_fn, -- expect 1
  position('if n >= p_max' in pg_get_functiondef(
    'public.check_rate_limit(text,int,int)'::regprocedure)) > 0 as has_0013_fix;    -- expect true
```

A lower `tables_found` means a file didn't run. `has_0013_fix = false` means 0013 was
skipped. If a file errors with "already exists", you ran it twice; move on.

### 1c. Allowlist your sign-in email(s)

Only allowlisted emails can create an account. `0001` seeds the placeholder
`you@example.com`. Remove it, then add each real person, one row each:

```sql
delete from public.allowed_emails where email = 'you@example.com';

insert into public.allowed_emails (email) values
  ('REPLACE-first-person@your-domain.com'),
  ('REPLACE-second-person@your-domain.com')
on conflict do nothing;
```

### 1d. Create the user account(s)

The first magic link creates the account automatically for an allowlisted email. Creating
it up front is more predictable, and required if you turn off new signups:

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the allowlisted **email**. Set any **password**; it's never used. Tick **Auto Confirm User** → create.
3. Repeat for each person.

### 1e. Magic links, redirect URLs and email delivery

1. **Authentication** → **Sign In / Providers** → **Email**: make sure the Email provider is **enabled** (on by default).
2. **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` for now. Change it to `https://YOUR-APP.vercel.app` after deploying (step 3a).
   - **Redirect URLs**: add both `http://localhost:3000/**` and `https://YOUR-APP.vercel.app/**`.
     The sign-in link lands on `/auth/confirm`, and it's refused if that URL isn't covered here.
3. **Email delivery.** Supabase's built-in email sender is meant for testing. It has a very
   low hourly cap, and on current plans may deliver only to members of your Supabase
   organization. If links don't arrive, check **Authentication → Rate Limits**, then set up
   your own sender under **Authentication → Emails → SMTP Settings** (any SMTP provider works,
   e.g. Resend, Postmark or Amazon SES).

### 1f. Copy the keys

1. Left sidebar → ⚙️ **Project Settings** → **API Keys** (or "Data API").
2. Copy three values:
   - **Project URL** (`https://YOUR-PROJECT-REF.supabase.co`).
     ⚠️ It must end at `.supabase.co`. If what you copied ends in `/rest/v1/`, delete that part, or every sign-in fails with "Invalid path specified in request URL".
   - **Publishable key** (or "anon public" under Legacy API Keys; either works). Safe in the browser.
   - **Secret key** (or "service_role" under Legacy API Keys; click reveal). 🔒 Server-only. Never commit or share it.

### 1g. Fill in `.env.local`

```bash
cp .env.example .env.local
```

Then replace the placeholders in `.env.local` (not `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co   # ← Project URL from 1f
NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE-with-publishable-key       # ← 1f
SUPABASE_SERVICE_ROLE_KEY=REPLACE-with-secret-key                # ← 1f, server-only
ALLOWED_EMAILS=REPLACE-first-person@your-domain.com,REPLACE-second-person@your-domain.com
PROFILES=REPLACE-Name:REPLACE-first-person@your-domain.com,REPLACE-Name:REPLACE-second-person@your-domain.com
LLM_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=REPLACE-with-gemini-key             # ← Part 2
```

`PROFILES` is comma-separated `Name:email` pairs, shown in that order on the login screen.
Every email must match 1c.

### 1h. Test sign-in locally

1. `npm install`, then `npm run dev`.
2. Open **http://localhost:3000** → **Sign in** → you see one button per profile.
3. Click your **profile** → check your email → click the link.

✅ **Checkpoint:** you land on the dashboard, signed in.
If it goes wrong:
- **"No profiles configured"**: `PROFILES` is empty or malformed. Restart `npm run dev` after editing `.env.local`.
- **Clicking a profile shows an error instead of "Check your email"**: that email is probably missing from the `allowed_emails` table (1c).
- **Signed in, then bounced to the login page**: the email is missing from `ALLOWED_EMAILS`/`PROFILES`.
- **No email**: see 1e step 3.

---

## Part 2 — Gemini API key (~2 min)

1. Go to **aistudio.google.com** → sign in with your Google account.
2. **Get API key** → **Create API key** → copy it.
3. Paste it into `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY=`.

This powers compile-on-ingest, chat, cards, quizzes, plans and teach-back. The key is
server-only and billed to you. (Optional fallback: set `OPENAI_API_KEY` and `LLM_PROVIDER=openai`.)

---

## Part 3 — Deploy on Vercel (~5 min)

### 3a. Import and deploy

1. Go to **vercel.com** → **Log in with GitHub**.
2. **Add New…** → **Project** → pick your fork of this repo → **Import**.
3. **Before clicking Deploy**, expand **Environment Variables** and add every line from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_EMAILS`, `PROFILES`
   - `LLM_PROVIDER` = `google`, `GOOGLE_GENERATIVE_AI_API_KEY`
   - *(optional)* anything from Part 4
4. Click **Deploy** and wait ~2 minutes. Vercel shows your URL, e.g. `https://YOUR-APP.vercel.app`.
5. Back in **Supabase → Authentication → URL Configuration**: set **Site URL** to that URL, and
   make sure `https://YOUR-APP.vercel.app/**` is in **Redirect URLs**. If you skip this, sign-in
   emails still send but the link won't log you in on the deployed site.

> `vercel.json` pins the region to `sin1` (Singapore). Change `regions` to one near your
> Supabase project if you're elsewhere, e.g. `iad1` (US East) or `fra1` (Frankfurt).

### 3b. Final checks

- [ ] Open your Vercel URL → **Sign in** → click a profile → the email arrives → the link signs you in.
- [ ] Create a session → upload a PDF → it compiles into a wiki and cards (plus figures, if the deck has diagrams).
- [ ] Vercel → your project → **Settings → Cron Jobs**: `/api/keepalive` is listed, daily. It stops Supabase pausing the project after 7 idle days.

Done: the app is live at $0/month.

---

## Part 4 — Optional features

| Variable | What it does | How to set it |
|---|---|---|
| `DEMO_SESSION_ID` | Turns on the public, read-only `/demo` page for one study session | Compile a session you're happy to publish, then run `select id, title from public.sessions;` in the SQL Editor and use its `id`. Leave empty to keep `/demo` off. |
| `DEMO_GEMINI_KEY` | A separate Gemini key for `/demo`, so public traffic can't use up your main quota | A second key from aistudio.google.com. Falls back to the main key if unset. |
| `CRON_SECRET` | Makes `/api/keepalive` require a bearer token | Any long random string, e.g. from `openssl rand -hex 32`. Vercel sends it automatically. |
| `OPENAI_API_KEY` | Fallback model provider | Only used when `LLM_PROVIDER=openai` or Gemini is unavailable |

> ⚠️ **`/demo` is public.** Anyone with the URL can read that session's wiki, cards and
> figures, open its source PDF pages, and ask its chat questions on your Gemini key (rate
> limited). Only point `DEMO_SESSION_ID` at material you have the right to publish.

See **[SECURITY.md](SECURITY.md)** before sharing your URL beyond a small trusted group.
