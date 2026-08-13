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

## Try it

**Deploy your own** (≈15 min; needs free Supabase + Gemini accounts):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkevinn-chan%2FValedictorian-Run-Demo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ALLOWED_EMAILS,PROFILES,GOOGLE_GENERATIVE_AI_API_KEY&envDescription=Supabase%20project%20keys%2C%20allowlisted%20emails%2C%20and%20a%20Gemini%20API%20key)

Then follow **[SETUP.md](SETUP.md)** for the Supabase project + running the migration in
`supabase/migrations/`. Or run locally:

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + Gemini values
npm run dev                  # http://localhost:3000
```

**A note on the login:** sign-in is a **single shared password** (real Supabase
`signInWithPassword`) that then lets you pick either profile — built for a small, trusted
group, not open public signup. The public **[`/demo`](https://valedictorian-run.vercel.app/demo)**
above is how strangers try it without an account. See **[SECURITY.md](SECURITY.md)** for exactly
what to change before an open multi-user deploy (per-user signup, drop the allowlist, per-user
rate limits + bring-your-own API key).

---

## Docs

- [SECURITY.md](SECURITY.md) — the auth model, what's safe, and what to change before any public deploy.
- [SETUP.md](SETUP.md) — click-by-click cloud setup.
- [PLAN.md](PLAN.md) — architecture and build phases.
- [PRODUCT.md](PRODUCT.md) — product/design context.
- [PLATFORM-FACTS.md](PLATFORM-FACTS.md) — verified free-tier platform limits.

## License

[MIT](LICENSE) — do what you like; no warranty.
