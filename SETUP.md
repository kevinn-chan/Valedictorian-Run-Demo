# Cloud Setup — click-by-click

Three parts, in order: **Supabase → Gemini key → Vercel**. ~15 minutes total.
Sign-in is a **single shared password** (then you pick a profile) — no SMTP, no email
templates, no magic links to configure.

---

## Part 1 — Supabase (~8 min)

### 1a. Create the project (skip if already done)

1. Go to **supabase.com** → sign in → **New project**.
2. Name: `valedictorian-run` · Database password: click **Generate** and save it somewhere · Region: closest to you (e.g. Singapore) · Plan: **Free**.
3. Wait ~2 minutes until the project dashboard loads.

### 1b. Create the schema (run all three migrations)

1. Left sidebar → **SQL Editor** → **New query**.
2. Run each file from `supabase/migrations/` **in order** — open it, select all, paste, **Run**:
   - `0001_init.sql` — tables, RLS, the signup allowlist, **and the `session-files` storage bucket + policies**.
   - `0002_exam_results.sql` — mock-exam history.
   - `0003_figures.sql` — the figure pipeline table.

✅ **Checkpoint:** each run says `Success. No rows returned`. An "already exists" error just means you ran that file twice — fine, move on.

### 1c. Allowlist your sign-in email(s)

Only allowlisted emails can have an account. `0001` seeds a placeholder; set yours:

```sql
insert into public.allowed_emails (email) values ('you@example.com')
  on conflict do nothing;
-- add a second person the same way, one row each
```

### 1d. Create the login account(s)

Sign-in is a shared password, so create each profile's account directly:

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the allowlisted **email**, set a **password** (this is the *shared* password everyone will type), and tick **Auto Confirm User** → create.
3. Repeat for each person — **use the same password for all of them**.

> Alternative: after an account exists, `node scripts/set-password.mjs <email> '<password>'` sets or rotates its password.

### 1e. Copy the keys

1. Left sidebar → ⚙️ **Project Settings** → **API Keys** (or "Data API").
2. Copy three values:
   - **Project URL** (`https://abcdefgh.supabase.co`).
     ⚠️ It must end at `.supabase.co` — if what you copied ends in `/rest/v1/`, delete that part, or every sign-in fails with "Invalid path specified in request URL".
   - **Publishable key** (or "anon public" under Legacy API Keys — either works).
   - **Secret key** (or "service_role" under Legacy API Keys — click reveal). ⚠️ Never share this one.

### 1f. Fill in `.env.local`

Duplicate `.env.example` → `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=        ← Project URL from 1e
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Publishable/anon key
SUPABASE_SERVICE_ROLE_KEY=       ← Secret/service_role key
ALLOWED_EMAILS=you@example.com,partner@example.com
PROFILES=You:you@example.com,Partner:partner@example.com   ← names shown on the login screen
LLM_PROVIDER=google
```

`PROFILES` is `Name:email` pairs; each email must be an account you created in 1d.

### 1g. Test sign-in locally

1. In the repo folder: `npm run dev`
2. Open **http://localhost:3000** → the login screen.
3. Enter the **shared password** → **Continue** → click your **profile**.

✅ **Checkpoint:** you land on the "No study sessions yet" page, signed in. A wrong password bounces you back with an error.

---

## Part 2 — Gemini API key (~2 min)

1. Go to **aistudio.google.com** → sign in with your Google account.
2. Click **Get API key** → **Create API key** → copy it.
3. Paste into `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY=...`

This powers compile-on-ingest, chat, cards, quizzes, and teach-back. (Optional break-glass: set `OPENAI_API_KEY` and flip `LLM_PROVIDER=openai`.)

---

## Part 3 — Deploy on Vercel (~5 min)

Use the website, not the CLI:

1. Go to **vercel.com** → **Sign up / Log in with GitHub**.
2. **Add New…** → **Project** → find your repo → **Import**.
3. **Before clicking Deploy:** expand **Environment Variables** and add every line from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_EMAILS`, `PROFILES`
   - `LLM_PROVIDER` = `google`, `GOOGLE_GENERATIVE_AI_API_KEY`
   - *(optional)* `DEMO_SESSION_ID` + `DEMO_GEMINI_KEY` to turn on the public read-only `/demo`.
4. Click **Deploy**. Wait ~2 min.

✅ **Checkpoint:** Vercel shows your live URL, e.g. `https://valedictorian-run.vercel.app`.

### 3b. Final checks

- [ ] Open the Vercel URL → enter the shared password → pick a profile → you're in.
- [ ] A wrong password is rejected.
- [ ] Upload a PDF to a session → it compiles into a wiki + cards (and figures, if the deck has diagrams).
- [ ] Vercel dashboard → your project → **Settings → Cron Jobs**: `/api/keepalive` listed, daily. (It stops Supabase pausing the project after 7 idle days.)

Done — the app is live at $0/month.
