# Study Sessions — Product & Implementation Plan

> Working title: **Study Sessions** (rename freely). A public web app where a student creates a
> "session", drops in a corpus of course files (PDFs, lecture notes, tutorial cheatsheets), and the
> app compiles that corpus into a study system: per-file/topic summaries, a targeted learning plan,
> auto-generated cue cards with answers, and a grounded Q&A chat that answers **only** from the
> session's materials, with page-level citations.

Status: **PLAN ONLY — no code written yet.** Phases below are designed to be executed one per
session (claude-mem `make-plan` format: each phase has doc references, verification, and
anti-pattern guards).

---

## 1. Research: Karpathy's "RAG is dead" — and what we actually take from it

### What Karpathy proposed
In April 2026 Karpathy published a gist arguing classic RAG (chunk → embed → vector-retrieve at
query time) is a dead end for personal/contained knowledge bases. His alternative — the **"LLM
wiki" / compile-on-ingest** pattern: the LLM digests the raw documents **once, at ingest time**,
into a persistent, interconnected, structured markdown knowledge base. Queries then read
already-digested knowledge instead of re-discovering it from raw chunks on every question.
"Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."

A related industry shift: agentic coding tools (Claude Code, Cursor, Devin) dropped embeddings for
**lexical/agentic search** (grep + read), because for small-to-medium corpora exact retrieval beats
fuzzy embedding similarity.

### Where each approach wins (from the 2026 comparative analyses)

| Approach | Setup cost | Per-query cost | Sweet spot |
|---|---|---|---|
| Classic vector RAG | $15K–$40K infra effort | $0.005–$0.01 | Millions of docs, high QPS |
| **LLM Wiki (compile-on-ingest)** | ~$0–$2K | $0.001–$0.003 | **Up to ~50K docs, contained domains** |
| Full agentic search | $100K+ | $0.05–$0.30 | Multi-source open-ended research |

### The verdict for THIS app
A student session is **tiny**: typically 5–50 files, a few hundred pages. That is squarely the
regime where Karpathy's critique is *correct* and vector RAG is over-engineering:

1. **Compile-on-ingest is not just retrieval — it IS our product.** The "corpus library" the user
   asked for (every word processed and stored) becomes a compiled wiki: per-file digests, topic
   pages, glossary, formula sheets. Summaries, learning plans, and flashcards are then cheap
   *views over the wiki*, not separate LLM pipelines over raw PDFs.
2. **Q&A doesn't need embeddings at this scale.** Two tiers:
   - **Tier A (default):** the session's compiled text (wiki + page-labeled chunks) fits in the
     model context → send it all; the prompt requires `[file p.N]` citations against the labeled
     chunks. Automatic prompt caching discounts repeat questions. Zero retrieval infrastructure.
   - **Tier B (large sessions):** Postgres **full-text search** (tsvector/BM25-style) over stored
     page-level chunks + the wiki index in context. Still no vector DB.
3. **Upgrade path stays open:** pgvector is one `create extension` away in the same Postgres if a
   future use case (cross-session search, huge corpora) demands semantic retrieval. We do not build
   it now.

**Decision: RAG-inspired grounding (answers restricted to corpus, with citations) — yes.
Vector-database RAG — no. Karpathy-style compiled wiki + lexical retrieval + full-context-with-
citations — this is the architecture.**

Sources:
- [RAG, LLM Wiki, Agentic Search: Differences, Costs and Use Cases (2026)](https://pasqualepillitteri.it/en/news/1496/rag-llm-wiki-agentic-search-differences-costs-2026)
- [Why Karpathy is Right: RAG is Dead, Long Live the Agentic Wiki — Epsilla](https://www.epsilla.com/blogs/karpathy-agentic-wiki-beyond-rag-enterprise-memory)
- [RAG Isn't Dead. But Something Is. Karpathy's LLM Wiki Explained — Medium](https://medium.com/@sathishkraju/rag-isnt-dead-but-something-is-karpathy-s-llm-wiki-explained-512e3393801b)
- [Reports of RAG's death have been greatly exaggerated — DEV](https://dev.to/kenforthewin/reports-of-rags-death-have-been-greatly-exaggerated-50ee)
- [Why Cursor, Claude Code, and Devin Use grep, Not Vectors — MindStudio](https://www.mindstudio.ai/blog/is-rag-dead-what-ai-agents-use-instead)
- [Agent Retrieval Is a Cost Curve Problem — HarrisonSec](https://harrisonsec.com/blog/agent-retrieval-cost-curve-claude-code-grep-vs-rag/)
- [Why I'm Against Claude Code's Grep-Only Retrieval — Milvus](https://milvus.io/blog/why-im-against-claude-codes-grep-only-retrieval-it-just-burns-too-many-tokens.md) (the counter-argument; applies at scales we don't hit)

---

## 2. Stack (lazy on purpose — fewest moving parts that ship publicly)

| Concern | Choice | Why |
|---|---|---|
| App framework | **Next.js (App Router) + TypeScript** | One codebase for UI + API routes; first-class on Vercel |
| Hosting | **Vercel** | User requirement; Hobby tier fine for launch (**non-commercial use only** — fine for a free student tool; overages pause, not bill) |
| DB + Auth + File storage | **Supabase** (one account) | Postgres + Auth + Storage in a single service; free tier generous; FTS + pgvector built in |
| LLM | **Gemini API free tier** (Flash / Flash-Lite), via the **Vercel AI SDK** provider layer | Genuinely $0: 1,500 req/day, native PDF reading (~1,000-page docs), JSON schema output, 1M context. OpenAI Tier 3 ($50) wired as **break-glass fallback** — an env-var switch, never the default |
| UI kit | Tailwind + shadcn/ui | Fast, boring, good |
| PDF viewing | Browser-native `<iframe>`/`<embed>` of the Supabase file URL first; `react-pdf` only if page-jump highlighting demands it | Ladder rule: native before dependency |

**BUDGET CONSTRAINT (hard requirement): the pipeline runs at $0/month.** Vercel Hobby (free),
Supabase Free (free), **Gemini API free tier** as the only LLM in normal operation. The Tier 3
OpenAI account ($50 credits) exists solely as a break-glass fallback (Gemini outage or daily
quota exhausted) — flipping `LLM_PROVIDER=openai` is the entire failover.

**DESIGNED FOR TWO.** The app serves exactly 2 allowlisted users. Consequences baked in:
- Every quota divides by 2 and **nothing binds**: ~500 MB file storage each (a full semester of
  courses live simultaneously), ~750 Gemini requests/day each (a heavy study day uses <150).
- **Auth is an allowlist**: 2 emails in an env var, magic-link sign-in, middleware +
  RLS enforcement. No signup flow, no abuse protection, no per-user quota machinery — just a
  small storage usage meter so pruning old sessions is easy.
  `ponytail:` allowlist auth; rebuild signup/quotas only if this ever opens to strangers.
- **Inactivity pause resolved**: a daily Vercel cron (`/api/keepalive` → trivial `select 1`)
  keeps Supabase's 7-day idle timer from ever firing, holiday weeks included. Fallback if Vercel
  cron misbehaves: a scheduled GitHub Action doing the same ping.

Gemini API features we lean on (limits verified 2026-07; API details flagged for re-check at
Phase 3 — see PLATFORM-FACTS.md):
- **PDF input:** native document understanding on Flash — up to ~1,000 pages per document, text
  + page vision (scans/handwriting work). Most files compile in ONE call; no page-span chunking
  except monsters. Upload via Gemini File API is **transient (~48 h TTL)** — recompiles re-upload
  from Supabase Storage, nothing stored on Google long-term.
- **Citations:** not native → app-built, unchanged: compile stores page-anchored chunks; Q&A
  context lines carry `[filename p.N]` labels the prompt must cite; UI resolves to the PDF page;
  grounding eval checks label accuracy.
- **Structured outputs:** JSON schema (`responseSchema`) on the free tier for flashcards, plans,
  and compile payloads.
- **Rate limits are the only real constraint:** ~15–30 RPM, 1,500 req/day (shared, per Google
  Cloud project, resets midnight PT). Ingest strictly sequential with backoff; at 2 users this
  is invisible.
- **Privacy caveat:** free-tier prompts may be used by Google for model training → one-line
  notice in the app footer; both users are known and consenting.
- **Provider abstraction:** all LLM calls go through the Vercel AI SDK (`@ai-sdk/google` /
  `@ai-sdk/openai`), so primary→break-glass is config, not code. (Lesson from Observation #2:
  provider-exclusive features need a provider-agnostic fallback — here the whole provider is
  swappable.)

(The Anthropic-native design — built-in page citations, 600-page requests — remains documented
in PLATFORM-FACTS.md as the upgrade path if a real budget ever materializes.)

What we deliberately skip (add only when the trigger fires):
- ❌ Vector DB / embeddings — trigger: corpora too large for FTS+wiki to answer well
- ❌ Queue/worker infra (Inngest, QStash) — trigger: ingest exceeds Vercel maxDuration
- ❌ OCR pipeline — Claude reads scanned PDFs visually already
- ❌ Custom PDF text extraction — Claude reads the PDF natively during compile
- ❌ Payments, orgs/teams, mobile apps

---

## 3. Data model (Supabase Postgres)

```
users            (from Supabase Auth)
sessions         id, user_id, title, goal_text, exam_date?, status, created_at
files            id, session_id, storage_path, name, mime, pages?, bytes,
                 ingest_status (pending|processing|done|error), created_at
chunks           id, file_id, session_id, page_from, page_to, text, tsv tsvector GENERATED
                 (GIN index)  -- Tier B retrieval + "every word stored" requirement
wiki_pages       id, session_id, slug, kind (file_digest|topic|glossary|formula_sheet|index),
                 title, markdown, source_refs jsonb, updated_at
learning_plans   id, session_id, markdown, generated_at, inputs jsonb (goal, exam_date, mastery)
cards            id, session_id, topic_slug, front, back, source_ref jsonb,
                 -- SRS state (SM-2 lite): interval_days, due_at, ease, reps, lapses
chats            id, session_id, title, created_at
messages         id, chat_id, role, content, citations jsonb, created_at
reviews          id, card_id, grade (again|good|easy), reviewed_at   -- powers mastery heatmap
```

Row-level security: every table keyed by `session_id → sessions.user_id = auth.uid()`.

---

## 4. Core pipelines

### 4.1 Ingest → Corpus Library (the Karpathy compile step)
Per uploaded file (one Vercel function invocation each — **must fit `maxDuration`: 300s on
Hobby, 800s on Pro**; one file per invocation + per-100-page compile calls keeps us inside 300s;
escape hatch if a monster file busts it: Vercel Workflows. Status row updated live):

1. Browser uploads file **directly to Supabase Storage** (signed upload URL — bypasses Vercel's
   request-body limit). Row created in `files` with `ingest_status='pending'`.
2. Server downloads from Storage → uploads to the **Gemini File API** (transient, ~48 h TTL —
   fine, compile runs immediately; recompiles re-upload from Storage).
3. **Compile call** (ONE per file for anything under ~1,000 pages / the token ceiling; page-span
   chunks only for monsters): Gemini Flash reads the PDF and returns, in one structured
   response: (a) page-level text chunks (→ `chunks`, satisfies "processes every single word"),
   (b) a file digest, (c) topic assignments + key terms + formulas with page refs.
4. **Merge call** (per session, after each file): update session-level wiki — topic pages, index
   page, glossary, formula sheet — linking across files (lecture ↔ tutorial ↔ cheatsheet).
5. Mark `ingest_status='done'`. UI shows per-file progress the whole way.

Cost note: **$0.00** — Gemini free tier. The only "cost" is requests against the daily quota
(a full session ingest ≈ 10–30 requests out of 1,500/day), hence sequential ingest + backoff
on 429. Every downstream feature reads the compiled wiki, which is tiny.

### 4.2 Summaries, Learning Plan, Flashcards — views over the wiki
- **Summaries:** file digests and topic pages are *already* the summaries; UI renders them.
  "Summarize shorter/longer" = one cheap call over the wiki page, not the PDF.
- **Learning plan:** one call: wiki index + topic list + student's goal + exam date + (later)
  mastery data → sequenced week-by-week plan with daily items linked to topics/cards. Regenerable.
- **Flashcards:** per topic page, one structured-outputs call → `[{front, back, source_ref}]`.
  Dedup by topic. Review UI = SM-2-lite spaced repetition (Again/Good/Easy → next `due_at`).
  `ponytail:` SM-2-lite, not FSRS; upgrade if retention data shows it matters.

### 4.3 Grounded Q&A (the "RAG-inspired" part)
- **System prompt contract:** *"Answer ONLY from the provided session materials. If the answer is
  not in them, say 'That's not covered in your session materials' and suggest the nearest covered
  topic. Cite pages for every claim."*
- Context is assembled from the DATABASE as plain text (wiki + chunks, every chunk labeled
  `[filename p.N]`) — raw PDFs are never re-sent after compile, which sidesteps OpenAI's
  100-page request cap and page-image token costs entirely.
- **Tier A (compiled corpus fits the model context, i.e. most sessions):** send wiki + all
  chunks, byte-stable at the prompt front (automatic caching discounts repeats). Answers must
  carry `[file p.N]` labels, rendered as clickable chips → opens the PDF at that page.
- **Tier B (oversize sessions):** FTS over `chunks` (websearch_to_tsquery) + always-in-context
  wiki index → top-k labeled chunks only.
- **Quantitative questions:** Gemini Flash handles course-level math; numbers/formulas come
  from the corpus (formula sheet + cited page). Escalation trigger: real datasets/statistics
  homework → Gemini's code-execution tool (also free tier).
- Tier A vs B decided per session at ingest time from stored chunk token estimates.

**Grounding eval (do not skip):** 15-question fixture per test corpus — 10 answerable (must cite
correct pages), 5 unanswerable (must refuse). Run on every prompt change.

---

## 5. Phased implementation plan

> Execute one phase per session. Each phase: read the listed docs FIRST, copy documented patterns,
> verify before moving on. Anti-pattern guard for all phases: **do not invent SDK/API method names**
> — every Anthropic call comes from the claude-api skill docs; every Supabase/Vercel call from the
> Phase 0 findings below.

**Methodology (installed toolchain, applies to every phase):**
- **superpowers** — per phase: `brainstorming` before any new design decision, `writing-plans` /
  `executing-plans` for the phase itself, `test-driven-development` for non-trivial logic (SRS
  scheduler, retrieval tier selection, grounding guardrail), `verification-before-completion`
  before calling a phase done.
- **impeccable** — Phase 1 starts with `/impeccable init` (writes PRODUCT.md + DESIGN.md for
  study-sessions; context script already confirms `NO_PRODUCT_MD`). UI-heavy phases (2, 4, 5, 6)
  use `craft`/`shape`; Final phase runs `/impeccable audit` + `polish`. Its absolute bans
  (side-stripe cards, gradient text, eyebrow kickers, identical card grids, cream-default bg)
  are in force for all UI.
- **find-skills** — at Phase 1, search skills.sh for battle-tested Next.js/React/Supabase skills
  (e.g. `vercel-labs/agent-skills` react/next best-practices, 100K+ installs) before hand-rolling
  conventions.
- **task-observer** — active every session; observation log at
  `~/.claude/projects/-Users-kevinn-chan/skill-observations/log.md`.

### Phase 0 — Documentation discovery (DONE — findings summarized here)
- OpenAI API: PDF input limits, pricing, caching verified against official docs 2026-07 —
  see PLATFORM-FACTS.md. (Anthropic facts also preserved there but superseded by the
  free-pipeline constraint.)
- Vercel + Supabase platform limits and exact APIs: see **PLATFORM-FACTS.md** in this directory
  (produced by the documentation-discovery agent, with source URLs). Re-verify anything marked
  low-confidence there before relying on it in code.

### Phase 1 — Scaffold, auth, deploy skeleton
- `create-next-app` (TS, Tailwind, App Router) + shadcn/ui; Supabase project; `@supabase/ssr`
  auth (per PLATFORM-FACTS pattern) with **magic-link + 2-email allowlist** (`ALLOWED_EMAILS`
  env var, checked in middleware and mirrored in RLS); schema migration for §3 tables.
- **Keepalive cron:** `vercel.json` daily cron → `/api/keepalive` route → `select 1` against
  Supabase, so the 7-day inactivity pause never fires.
- Deploy to Vercel with env vars (`GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY` (break-glass),
  `LLM_PROVIDER=google`, Supabase keys, `ALLOWED_EMAILS`) on day one — public URL first.
- **Verify:** sign in on the deployed URL with an allowlisted email; a NON-allowlisted email is
  rejected; RLS blocks cross-user reads (manual SQL probe); cron shows a successful run in
  Vercel logs.

### Phase 2 — Sessions + file upload
- Session CRUD; drag-drop uploader → signed-URL direct upload to Supabase Storage; `files` rows
  with status chips.
- **Verify:** 30MB PDF uploads from the deployed site (proves the Vercel body-limit bypass);
  file listed with `pending` status; other users can't see it.

### Phase 3 — Ingest pipeline → Corpus Library
- §4.1 exactly. One route handler per file, `maxDuration` per PLATFORM-FACTS; structured-outputs
  compile call; `chunks` + `wiki_pages` written; wiki browser UI (index → topic/file pages).
- **Verify:** ingest a real lecture PDF; spot-check chunks match PDF text ("every word" check:
  pick 3 random sentences from the PDF, FTS-find them); wiki index links resolve.

### Phase 4 — Summaries + Learning plan
- Render digests/topic pages with length toggle; learning-plan generator (goal + exam date form).
- **Verify:** plan references only topics that exist in the wiki; regenerating with a different
  exam date changes the schedule.

### Phase 5 — Flashcards + review mode
- Per-topic card generation (structured outputs), review UI with keyboard shortcuts
  (space=flip, 1/2/3=grade), SM-2-lite scheduling, daily due queue on the session home.
- **Verify:** cards' `source_ref` pages actually contain the answer (sample 10); grading updates
  `due_at` correctly (unit-check the scheduler — the one non-trivial pure function so far).

### Phase 6 — Grounded Q&A chat
- §4.3: streaming chat route via the AI SDK, Tier A labeled-chunk context, `[file p.N]` citation
  chips → PDF page, Tier B FTS fallback, corpus-only guardrail.
- **Verify:** run the 15-question grounding eval (answerable questions must carry labels
  pointing at pages that contain the claim; unanswerable questions refuse); **failover drill:**
  flip `LLM_PROVIDER=openai`, ask one question, confirm it answers on the Tier 3 account, flip
  back.

### Phase 7 — Wow wave 1 (pick 2–3 from §6 below)
Recommended first three: **Quiz/mock-exam mode**, **Mastery heatmap**, **Teach-back mode** —
all reuse existing wiki + cards + Q&A machinery, no new infra.
- **Verify:** per-feature acceptance line agreed before building.

### Final phase — Verification pass
- Grounding eval green; Lighthouse pass on core pages; RLS probe rerun; grep for anti-patterns
  (every LLM call goes through the AI SDK provider layer — no direct provider SDK imports;
  Q&A context built only from session chunks; no invented SDK methods); quota smoke test: one
  full session lifecycle, count actual requests against the 1,500/day Gemini budget, and confirm
  the break-glass env switch works end to end.

---

## 6. Wow features (creative backlog, ranked by leverage/cost)

**Cheap now (reuse existing machinery):**
1. **Mock-exam generator** — from wiki topics: timed quiz (MCQ + short answer), auto-marked with
   page-cited model answers and per-topic score.
2. **Mastery heatmap** — topics × (card grades + quiz scores) → traffic-light grid; the learning
   plan re-sorts to attack red topics before the exam.
3. **Teach-back (Feynman) mode** — student explains a topic in their own words; Claude grades it
   against the wiki, lists what they nailed/missed/got wrong, with citations.
4. **Exam countdown re-planning** — plan compresses automatically as exam date approaches,
   prioritizing red heatmap topics.
5. **Coverage gap detector** — paste the syllabus/learning outcomes; report which outcomes your
   uploaded materials never cover (the inverse of Q&A refusal).
6. **Click-to-page citations everywhere** — every summary bullet, card, and answer deep-links to
   the exact PDF page (we have page refs throughout; this is pure UI).

**Later (new surface area):**
7. **Study-group sessions** — share a session read-only by link; shared card decks.
8. **Audio recap** — TTS the topic summaries into a per-topic "podcast" for commutes.
9. **Confusion hotspots** — mine chat questions + card lapses to auto-write a personal
   "things I keep getting wrong" wiki page.
10. **Cross-session concept links** — this semester's session links to prerequisite topics in
    last semester's (needs cross-session search — this is the pgvector trigger).
11. **Handwritten-notes ingestion** — photos of handwritten notes; Claude's vision already reads
    them, so this is mostly an upload-UX feature.

---

## 7. Open decisions for Kevin (defaults chosen; override any)

| Decision | Default in this plan | Alternative |
|---|---|---|
| App name | "Study Sessions" (working) | anything |
| Auth | **DECIDED:** magic-link + 2-email allowlist | — |
| Model | **DECIDED:** Gemini 2.5 Flash (compile + Q&A), Flash-Lite for bulk passes | swap per-task after Phase 3 quality check |
| LLM billing | **DECIDED:** $0 — Gemini free tier; OpenAI Tier 3 $50 break-glass only (`LLM_PROVIDER` env switch) | — |
| User count | **DECIDED:** 2 allowlisted users; no signup, no abuse machinery | reopen only if the app ever goes public |
| Upload cap per file | **50 MB** (Supabase Free's hard cap — not our choice) | Supabase Pro ~$25/mo raises it to configurable-up-to-500GB |
| Vercel tier | Hobby (free, non-commercial, 300s functions) | Pro ($20/mo) for 800s ingest functions + no usage-pause risk |
