# Valedictorian Run

Turn a course's raw materials — lecture PDFs, notes, cheatsheets — into a complete study
system: a browsable topic **wiki**, per-file **digests**, a targeted **learning plan**,
spaced-repetition **flashcards**, **teach-back** grading, timed **mock exams**, and a
**Q&A chat that answers only from your materials, with page citations**.

Runs at **$0/month** on free tiers (Next.js on Vercel + Supabase + Gemini).

> ⚠️ **Read [SECURITY.md](SECURITY.md) before deploying this for anyone but yourself.**
> As shipped, this is a private app for a tiny, trusted group: the login screen is a
> click-to-enter **profile picker with no password** — *knowing the URL grants access.*
> That is a deliberate choice for a 2-person deployment, **not** something to expose
> publicly as-is. SECURITY.md explains exactly what to change first (swap in real auth,
> remove the allowlist, add per-user rate limits + bring-your-own API key).

## Why it's interesting: compile-on-ingest, not vector RAG

Most "chat with your docs" apps chunk text, embed it, and do vector-similarity search at
query time (classic RAG). This one deliberately **doesn't** — there are no embeddings and
no vector database anywhere.

Instead, at **upload time** an LLM reads each document once and *compiles* it into a durable
artifact: a structured wiki (topics, formulas, exam traps) plus faithfully page-labeled text
chunks. Then at query time:

- **Tier A (the common case):** the whole compiled corpus is small enough to drop *entirely*
  into the model's context window — no retrieval at all.
- **Tier B (large corpora only):** falls back to cheap **lexical** full-text search
  (Postgres `tsvector`), never vectors.

The bet is Karpathy's "context engineering over retrieval": do the expensive understanding
**up front**, keep the source's page references for citations, and skip the vector machinery.
See [`src/lib/answer.ts`](src/lib/answer.ts) and [`src/lib/ingest.ts`](src/lib/ingest.ts).

## Features

- **Sessions** — one per course; holds the full corpus.
- **Compile-on-ingest** — PDFs/notes → page-cited chunks + a topic wiki + file digests.
- **Corpus wiki** — browsable topics with concise/full toggle and prev/next navigation.
- **Learning plan** — a day-by-day plan grounded only in your compiled corpus.
- **Flashcards** — auto-generated, SM-2-lite spaced repetition with keyboard grading.
- **Teach-back** — explain a topic from memory; get graded strictly against your materials.
- **Mock exams** — fresh 10-question papers, each answer cited; attempt history persists.
- **Grounded chat** — answers only from the corpus, every claim linked to its source page;
  says "that isn't in your materials" instead of guessing.
- **Mastery heatmap** — per-topic mastery from your review history.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + RLS + Storage +
Auth) · Vercel AI SDK · Gemini (free tier; OpenAI as a drop-in fallback via `LLM_PROVIDER`).

Row-Level Security isolates every user's data at the database layer — the data model is
already multi-tenant; only the login screen is single-purpose (see SECURITY.md).

## Quickstart (self-host)

```bash
npm install
cp .env.example .env.local     # fill in your Supabase + Gemini values
npm run dev                    # http://localhost:3000
```

Then follow **[SETUP.md](SETUP.md)** for the ~15-minute cloud setup (Supabase project → run
the migration in `supabase/migrations/` → Gemini API key → deploy to Vercel).

## Documentation

- [SETUP.md](SETUP.md) — click-by-click cloud setup.
- [SECURITY.md](SECURITY.md) — the auth model and what to change before any public deploy.
- [PLAN.md](PLAN.md) — architecture and build phases.
- [PRODUCT.md](PRODUCT.md) — product/design context.
- [PLATFORM-FACTS.md](PLATFORM-FACTS.md) — verified free-tier platform limits.

## License

[MIT](LICENSE) — do what you like; no warranty.
