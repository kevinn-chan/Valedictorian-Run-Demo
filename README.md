# Valedictorian Run

**Valedictorian Run** turns a course's PDFs and notes into a full study system: a browsable topic
wiki, spaced-repetition flashcards, mock exams, teach-back grading, a day-by-day learning plan,
and a Q&A chat that answers only from your materials — **every answer cited to its source page**.
Drop in a semester's slides, get back something you can actually study from.

**Poke the live demo →** **[valedictorian-run.vercel.app/demo](https://valedictorian-run.vercel.app/demo)**
— a read-only sample course, already compiled: browse the wiki and ask it cited questions, no sign-in.

---

## Features

- **Sessions** — one per course; holds the full corpus.
- **Compile-on-ingest** — PDFs/notes → page-cited chunks + a topic wiki + file digests.
- **Visual-aware ingest** — figures rasterized, stored, and topic-linked; the chat reads a diagram and answers from it, cited.
- **Corpus wiki** — browsable topics, concise/full toggle, prev/next navigation.
- **Learning plan** — a day-by-day plan grounded only in your compiled corpus.
- **Flashcards** — auto-generated, SM-2-lite spaced repetition with keyboard grading.
- **Due-today queue** — one cross-session review of every card due now, graded in place.
- **Teach-back** — explain a topic from memory; graded strictly against your materials.
- **Mock exams** — fresh 10-question papers, each answer cited; attempt history persists.
- **Grounded chat** — corpus-only answers, every claim linked to its source page.
- **Progress** — per-topic mastery from your review history, plus mock-exam accuracy over time.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + RLS +
Storage + Auth) · Vercel AI SDK · Gemini free tier (OpenAI as a drop-in fallback) · `mupdf` +
`sharp` for figure rasterization. Runs at **$0/month**.

---

## How it works: no vector database

The grounded chat and citations run with **no embeddings and no vector database anywhere.**

**1. Compile-on-ingest, not embed-on-ingest.** &nbsp;([`src/lib/ingest.ts`](src/lib/ingest.ts))
When you upload a file, an LLM reads it *once* and compiles it into durable artifacts: a
structured **wiki** (topics, formulas, common exam traps), faithfully **page-labeled chunks**
(every page transcribed), and **figures** — the model flags pages with real diagrams, we
rasterize them (`mupdf` → `sharp` → WebP), store them, and link each to its topic. The expensive
"understanding" happens once, at upload — not on every query. Because a figure is just its stored
image plus a page label, the chat can *read a diagram* and answer from it, still cited.

**2. Full context first; lexical retrieval only as a fallback.** &nbsp;([`src/lib/answer.ts`](src/lib/answer.ts))
Almost always, the *entire* compiled corpus is dropped into the model's context window — no
retrieval step at all. Only once a session's corpus passes ~600k chars does it fall back to
cheap **lexical** full-text search (Postgres `tsvector`) to select the relevant pages — still no
embeddings, still no vectors. Grounding survives either way because page labels are kept
throughout: every claim links back to `[file p.N]`.

This wasn't an arbitrary choice — it's inspired by Andrej Karpathy's **"RAG is dead"** framing: as
context windows grow, the classic chunk → embed → vector-similarity pipeline becomes unnecessary
machinery for any corpus that already fits in context. For a bounded, personal corpus like one
course's materials, that turned out right: no vector DB to run, no relevance tuning, no retrieval
drift — you get RAG's genuinely valuable output (cited, source-anchored answers) without the
vector plumbing. The honest caveat: past ~600k chars it still needs lexical retrieval, so the
claim isn't "retrieval is dead," it's "vector RAG is unnecessary for the common case."

---

## Run your own

This repo is ready to self-host. Nothing in it is tied to the original deployment: every
key, email and URL is a placeholder you replace with your own. It runs entirely on free
tiers, for yourself alone or a few people.

### What you need

- **Node.js 20.9 or newer** and a GitHub account.
- Free accounts on **[Supabase](https://supabase.com)** (database, file storage, sign-in),
  **[Google AI Studio](https://aistudio.google.com)** (the Gemini API key), and
  **[Vercel](https://vercel.com)** (hosting; optional if you only run it locally).

### The steps, in order

**[SETUP.md](SETUP.md)** walks through each step click by click, and opens with a table of every
placeholder to replace. The short version:

1. **Supabase:** create a project, run the 13 SQL files in `supabase/migrations/` in order,
   and allowlist the email address of each person who will sign in.
2. **Supabase Auth:** add your local and deployed URLs to the redirect list. If magic-link
   emails don't arrive, set up your own email sender (the built-in one is for testing).
3. **Gemini:** create an API key.
4. **Configure:** copy `.env.example` to `.env.local` and fill it in.
5. **Run it:** locally, or deploy to Vercel.

```bash
npm install
cp .env.example .env.local   # fill in .env.local, never .env.example (it's committed)
npm run dev                  # http://localhost:3000
```

Or deploy straight to Vercel. Do step 1 first, because the button asks for your Supabase keys:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkevinn-chan%2FValedictorian-Run-Demo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ALLOWED_EMAILS,PROFILES,GOOGLE_GENERATIVE_AI_API_KEY&envDescription=Supabase%20project%20keys%2C%20allowlisted%20emails%2C%20and%20a%20Gemini%20API%20key)

### What you replace

| Setting | What goes there | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase project's URL and keys | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your Gemini API key | Yes |
| `ALLOWED_EMAILS` | Comma-separated emails of the people who can sign in | Yes |
| `PROFILES` | `Name:email` for each person, shown as buttons on the login screen. One person is fine, and so are more than two. | Yes |
| `allowed_emails` table | The same emails, added in Supabase (SETUP.md step 1c) | Yes |
| `DEMO_SESSION_ID`, `DEMO_GEMINI_KEY` | Turn on a public read-only `/demo` of one of your sessions | No |
| `OPENAI_API_KEY`, `LLM_PROVIDER` | Optional fallback model provider | No |
| `CRON_SECRET` | Protects the daily keep-alive job | No |

Real values go only in `.env.local` (gitignored) and Vercel's Environment Variables.

### How sign-in works

Pick your profile, get a sign-in link by email, click it. There are no passwords. Once
signed in, anyone on the allowlist can switch into any other profile without a second email.
That suits you alone or a small trusted group; before opening it to strangers, read
**[SECURITY.md](SECURITY.md)**, which lists exactly what to change. The
**[live demo](https://valedictorian-run.vercel.app/demo)** is the original author's
deployment, so you can try the app before setting anything up.

---

## Docs

- [SECURITY.md](SECURITY.md) — the auth model, what's safe, and what to change before any public deploy.
- [SETUP.md](SETUP.md) — click-by-click cloud setup.
- [PLAN.md](PLAN.md) — architecture and build phases.
- [PRODUCT.md](PRODUCT.md) — product/design context.
- [PLATFORM-FACTS.md](PLATFORM-FACTS.md) — verified free-tier platform limits.

## License

[MIT](LICENSE) — do what you like; no warranty.
