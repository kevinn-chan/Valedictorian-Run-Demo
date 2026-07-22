# RAG is dead? — a working take

**Our answer: mostly yes, for the common case — and here's a real, deployed app that runs on
that bet.**

**Valedictorian Run** turns a course's PDFs and notes into a study system — a browsable topic
wiki, spaced-repetition flashcards, mock exams, teach-back grading, and a Q&A chat that answers
only from your materials *with page citations*. It does the thing everyone reaches for
("chat with your documents"), but with **no embeddings and no vector database anywhere.**
It's our take on the "RAG is dead" idea Andrej Karpathy and others have been circling.

---

## The idea

"RAG is dead" is deliberately provocative. The precise version:

> As context windows grow, the classic RAG pipeline — chunk → embed → vector-similarity
> top-k → stuff the prompt — becomes unnecessary machinery for any corpus that already fits
> in context. Retrieval isn't banned; **reaching for a vector DB by default is what's dying.**

Karpathy's framing is *context engineering*: do the expensive understanding **up front**, put
the right material in the context window, and stop treating a vector index as a prerequisite
for grounding.

## Our take

We took that seriously and built a real product around it. Two moves:

**1. Compile-on-ingest, not embed-on-ingest.** &nbsp;([`src/lib/ingest.ts`](src/lib/ingest.ts))
When you upload a file, an LLM reads it *once* and compiles it into durable artifacts:
- a structured **wiki** — topics, formulas, common exam traps; and
- faithfully **page-labeled chunks** — every page transcribed.

The expensive "understanding" happens once, at upload — not on every query.

**2. Full context first; lexical retrieval only as a fallback.** &nbsp;([`src/lib/answer.ts`](src/lib/answer.ts))
- **Tier A (almost always):** the *entire* compiled corpus is dropped into the model's context
  window. No retrieval step at all.
- **Tier B (only past ~600k chars):** cheap **lexical** full-text search (Postgres `tsvector`)
  selects the relevant pages — still no embeddings, still no vectors.

Grounding survives because we keep the page labels: every claim links back to `[file p.N]`.
You get RAG's one genuinely valuable output — **cited, source-anchored answers** — without the
vector plumbing.

## Does it actually work? (honest scorecard)

- ✅ **For a course-sized corpus, yes.** A semester of slides compiles to well under the context
  budget; the model answers from the whole thing at once, cites the right pages, and refuses
  ("that isn't in your materials") instead of hallucinating.
- ✅ **Simpler and cheaper to operate.** No vector DB, no embedding pipeline, no re-indexing —
  just Postgres.
- ⚠️ **The tail still needs retrieval.** Past ~600k chars we fall back to lexical search. So the
  honest claim isn't "retrieval is dead" — it's **"vector RAG is unnecessary for the common
  case; lightweight keyword retrieval covers the rest."**
- ⚠️ **You pay up front.** Compile-on-ingest spends a real LLM call per document. The bet is that
  cost amortizes across every later query — chat, cards, quizzes, and teach-back all read the
  same clean compiled corpus.

The take, in one line: **for bounded, personal corpora, compile + long-context + lexical
fallback beats vector RAG on simplicity and grounding, and matches it on quality.**

---

## The app that proves it

- **Sessions** — one per course; holds the full corpus.
- **Compile-on-ingest** — PDFs/notes → page-cited chunks + a topic wiki + file digests.
- **Corpus wiki** — browsable topics, concise/full toggle, prev/next navigation.
- **Learning plan** — a day-by-day plan grounded only in your compiled corpus.
- **Flashcards** — auto-generated, SM-2-lite spaced repetition with keyboard grading.
- **Teach-back** — explain a topic from memory; graded strictly against your materials.
- **Mock exams** — fresh 10-question papers, each answer cited; attempt history persists.
- **Grounded chat** — corpus-only answers, every claim linked to its source page.
- **Mastery heatmap** — per-topic mastery from your review history.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + RLS +
Storage + Auth) · Vercel AI SDK · Gemini free tier (OpenAI as a drop-in fallback). Runs at
**$0/month**.

---

## Try it

**Poke the live demo →** **[valedictorian-run.vercel.app/demo](https://valedictorian-run.vercel.app/demo)**
— a read-only sample course, already compiled: browse the wiki and ask it cited
questions, no sign-in. (It's the `/demo` route in this repo; point `DEMO_SESSION_ID`
at one of your own compiled sessions to enable it on your deploy.)

**Deploy your own** (≈15 min; needs free Supabase + Gemini accounts):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkevinn-chan%2FFirst-Class-Honours&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ALLOWED_EMAILS,PROFILES,GOOGLE_GENERATIVE_AI_API_KEY&envDescription=Supabase%20project%20keys%2C%20allowlisted%20emails%2C%20and%20a%20Gemini%20API%20key)

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
