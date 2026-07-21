# Cloud Setup — click-by-click

Three parts, in order: **Supabase → Gemini key → Vercel**. ~15 minutes total.
No custom SMTP, no email template editing — the app handles Supabase's default emails.

---

## Part 1 — Supabase (~7 min)

### 1a. Create the project (skip if already done)

1. Go to **supabase.com** → sign in → **New project**.
2. Name: `valedictorian-run` · Database password: click **Generate** and save it somewhere · Region: closest to you (e.g. Singapore) · Plan: **Free**.
3. Wait ~2 minutes until the project dashboard loads.

### 1b. Create the database tables

1. Left sidebar → **SQL Editor** → **New query**.
2. On your computer, open the file `supabase/migrations/0001_init.sql` (in this repo), select **all** of it, copy.
3. Paste into the SQL editor → click **Run** (bottom right).

✅ **Checkpoint:** it says `Success. No rows returned`. If you see an error mentioning something "already exists", you ran it twice — that's fine, move on.

### 1c. Auth URL configuration

1. Left sidebar → **Authentication** → **URL Configuration** (under CONFIGURATION).
2. **Site URL**: `http://localhost:3000` → **Save changes**.
3. Under **Redirect URLs** → **Add URL** → enter exactly:
   `http://localhost:3000/**`
   (the `/**` matters — it allows the sign-in link to return to any page of the app) → save.

> Do **NOT** touch Emails / templates / SMTP. Not needed.

✅ **Checkpoint:** Site URL shows `http://localhost:3000`, Redirect URLs list shows `http://localhost:3000/**`.

### 1d. Copy the three keys

1. Left sidebar → ⚙️ **Project Settings** → **API Keys** (or "Data API").
2. Copy these three values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`).
     ⚠️ It must end at `.supabase.co` — if what you copied ends in `/rest/v1/`, delete that
     part, or every sign-in fails with "Invalid path specified in request URL".
   - **Publishable key** (or "anon public" under Legacy API Keys — either works)
   - **Secret key** (or "service_role" under Legacy API Keys — click reveal). ⚠️ Never share this one.

### 1e. Put the keys in the app

1. In the repo folder, duplicate `.env.example` and rename the copy to `.env.local` (or overwrite the existing `.env.local`).
2. Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=  ← Project URL from 1d
NEXT_PUBLIC_SUPABASE_ANON_KEY=  ← Publishable/anon key
SUPABASE_SERVICE_ROLE_KEY=  ← Secret/service_role key
ALLOWED_EMAILS=you@example.com
LLM_PROVIDER=google
```

### 1f. Test sign-in locally

1. In the repo folder: `npm run dev`
2. Open **http://localhost:3000** → it redirects to the login page.
3. Enter `you@example.com` → **Send sign-in link**.
4. Check your inbox (**and spam**). Click the link **on the same device and browser** you requested it from.

✅ **Checkpoint:** you land on the "No study sessions yet" page, signed in.

⚠️ If no email arrives: Supabase's built-in sender is limited to only a few emails per hour. If you tried several times earlier today, wait an hour and try once.

---

## Part 2 — Gemini API key (~2 min)

1. Go to **aistudio.google.com** → sign in with your Google account.
2. Click **Get API key** → **Create API key** → copy it.
3. Paste into `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY=...`

(Nothing uses it yet — Phase 2 will. Setting it now means deploy is done once.)

---

## Part 3 — Deploy on Vercel (~5 min)

Use the website, not the CLI:

1. Go to **vercel.com** → **Sign up / Log in with GitHub**.
2. **Add New…** → **Project** → find **Valedictorian-Run** in the repo list → **Import**.
3. **Before clicking Deploy:** expand **Environment Variables** and add every line from your `.env.local` (name in the left box, value in the right box):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_EMAILS`
   - `LLM_PROVIDER` = `google`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
4. Click **Deploy**. Wait ~2 min.

✅ **Checkpoint:** Vercel shows your live URL, e.g. `https://valedictorian-run.vercel.app`.

### 3b. Point Supabase at the live URL

1. Back in Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: change to your Vercel URL (e.g. `https://valedictorian-run.vercel.app`) → save.
   - **Redirect URLs** → **Add URL** → `https://valedictorian-run.vercel.app/**` → save.
   - Keep the localhost entries too (so local dev keeps working).

### 3c. Final checks

- [ ] Open the Vercel URL → sign in with your email via magic link → you're in.
- [ ] Try a different email address → the link never arrives / sign-in fails (allowlist working).
- [ ] Vercel dashboard → your project → **Settings → Cron Jobs**: `/api/keepalive` listed, daily. (It prevents Supabase from pausing the project after 7 idle days.)

Done — the app is live at $0/month. Come back and tell Claude "cloud setup done" to start Phase 2.
