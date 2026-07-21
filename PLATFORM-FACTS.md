# Platform Facts (verified 2026-07-18, official docs)

Verified by a documentation-discovery agent against vercel.com/docs, supabase.com/docs,
nextjs.org/docs, and the supabase/storage-js source. Anything low-confidence is flagged.

## Vercel

- **Request/response body limit: 4.5 MB** (`413 FUNCTION_PAYLOAD_TOO_LARGE`). Applies both ways —
  uploads AND serving files must go browser ↔ Supabase Storage directly, never through a route.
  Source: vercel.com/docs/functions/limitations
- **Function max duration (fluid compute, default on new projects):**
  Hobby default/max **300s**; Pro max **800s GA** (1800s in beta — do NOT build the critical path
  on the beta). Legacy pre-2025 projects have lower limits.
  App Router pattern: `export const maxDuration = 300;` at the top of `route.ts`
  (or `vercel.json` → `functions.{glob}.maxDuration`). Escape hatch for untimed jobs: Vercel
  Workflows. Source: vercel.com/docs/functions/configuring-functions/duration
- **Hobby tier is non-commercial only.** Included monthly: 100 GB transfer, 1M invocations,
  4 CPU-hrs Active CPU (LLM-API *waiting* doesn't count as active CPU), 360 GB-hrs memory.
  On overage the feature **pauses** until the 30-day reset (no pay-as-you-go on Hobby).
  Source: vercel.com/docs/plans/hobby, vercel.com/docs/limits
- **Cron jobs on Hobby:** supported, limited (low count, once-per-day schedules, minute-level
  timing not guaranteed) — sufficient for the daily Supabase keepalive ping. From model
  knowledge; re-verify exact Hobby cron limits at Phase 1. Fallback: scheduled GitHub Action.

## Supabase

- **Storage direct upload (signed URL):**
  server: `storage.from(bucket).createSignedUploadUrl(path, { upsert? })` →
  `{ signedUrl, token, path }` (token valid **2 hours**, fixed);
  browser: `storage.from(bucket).uploadToSignedUrl(path, token, file)`.
  Docs pages: `/docs/reference/javascript/storage-from-createsigneduploadurl` and
  `.../storage-from-uploadtosignedurl` (note the `storage-from-` prefix).
- **Resumable (TUS) upload** for >6MB / progress bars:
  endpoint `https://{projectId}.storage.supabase.co/storage/v1/upload/resumable`,
  chunk size **exactly 6 MB**, clients `tus-js-client` / `@uppy/tus`.
  Source: supabase.com/docs/guides/storage/uploads/resumable-uploads
- **Max file size: Free plan hard cap 50 MB** (global, not raisable). Pro (~$25/mo) configurable
  up to 500 GB. → MVP upload cap = 50 MB on Free.
  Source: supabase.com/docs/guides/storage/uploads/file-limits
- **Auth for Next.js App Router:** `@supabase/ssr` + `@supabase/supabase-js`. Three pieces:
  `createBrowserClient()`, `createServerClient()`, and middleware to refresh tokens (Server
  Components can't write cookies). Use `getClaims()` (verifies JWT) server-side, not
  `getSession()`. Source: supabase.com/docs/guides/auth/server-side/nextjs
- **Full-text search:** confirmed pattern —
  `alter table chunks add column tsv tsvector generated always as (to_tsvector('english', text)) stored;`
  `create index ... using gin (tsv);` query with `@@` / `websearch_to_tsquery` (core Postgres,
  available). `setweight` for ranking. Source: supabase.com/docs/guides/database/full-text-search
- **pgvector:** available as an extension (`create extension vector with schema extensions;`),
  HNSW/IVFFlat indexes — confirmed as the later upgrade path, not used at MVP.

## Supabase free-tier quotas & 2-user capacity (verified 2026-07-18)

- Free plan: **500 MB database, 1 GB file storage, ~5 GB egress/mo, 50,000 MAU, max 2 active
  projects**. Sources: aiagencyplus.com/supabase-free-tier-limits, uibakery.io/blog/supabase-pricing
- **Projects pause after 7 days of zero activity** (manual dashboard restart, ~60 s cold start).
  Resolved by the daily Vercel cron keepalive (`/api/keepalive` → `select 1`).
- At 2 users nothing binds: ~500 MB storage each ≈ a full live semester of course PDFs per user;
  DB and egress have order-of-magnitude headroom.

## Gemini API (verified 2026-07-18 — THE production LLM; free tier)

- **Free tier limits (per Google Cloud project, reset midnight PT):** Flash / Flash-Lite
  **1,500 requests/day, ~1M TPM, 15–30 RPM**. Pro models are paywalled since Apr 2026 — free
  tier is Flash-class only (fine for this workload). Extra API keys do NOT add quota.
  Sources: ai.google.dev/gemini-api/docs/rate-limits, tokenmix.ai/blog/gemini-api-free-tier-limits,
  pecollective.com/tools/gemini-free-tier-guide
- **PDF input:** native document understanding (text + page vision, scans OK); ~1,000 pages per
  document; 1M context. *(Page cap from model knowledge — re-verify at Phase 3.)*
- **File API:** free; uploads are **transient (~48 h TTL)** → never store Gemini file refs;
  recompiles re-upload from Supabase Storage. *(TTL from model knowledge — re-verify at Phase 3.)*
- **Structured outputs:** JSON mode / `responseSchema` available on free tier.
- **Code execution tool:** available; believed free-tier-accessible. *(Re-verify at Phase 6
  before relying on it for quantitative escalation.)*
- **Training caveat:** free-tier prompts may be used by Google to improve products (paid tier is
  not) → in-app privacy notice; both users known and consenting.
- **SDK:** Vercel AI SDK `@ai-sdk/google` provider; switch to `@ai-sdk/openai` via
  `LLM_PROVIDER` env var (break-glass).

## OpenAI (verified 2026-07-18 — BREAK-GLASS ONLY: Tier 3 account, $50 credits)

- **Why not primary:** OpenAI has effectively no usable free API tier in 2026 (paid tiers start
  at $5; free accounts carry tight per-day caps). The Tier 3 account (~5,000 RPM, high TPM, no
  daily caps) has enormous headroom — reserved for Gemini outages/quota exhaustion per Kevin's
  instruction. Sources: developers.openai.com/api/docs/guides/rate-limits,
  inference.net/content/openai-rate-limits-guide

- **PDF input:** Responses API `input_file` content part; upload via Files API or base64.
  **Limits: 100 pages and 32 MB total per request across all file inputs** (per-file ≤50 MB).
  Requires a vision model (gpt-4o and later); the API feeds both extracted text AND page images
  into context (drives token use — `detail: low|auto|high` controls image detail).
  Sources: developers.openai.com/api/docs/guides/file-inputs
- **Pricing (2026):** `gpt-5-nano` $0.05/M in, $0.40/M out; current mini-class ~$0.75/M in,
  ~$4.50/M out. Sources: developers.openai.com/api/docs/pricing, modelpricing.ai/models/openai
- **Prompt caching:** automatic for repeated prefixes ≥1024 tokens, ~50% input discount;
  verify via `usage.prompt_tokens_details.cached_tokens`. Keep corpus block byte-stable first.
- **Structured outputs:** json_schema with `strict: true` (Responses API `text.format`).
- **No native citations** (unlike Anthropic) — app-level `[file p.N]` labeling instead.
- **Rate limits:** tier-based on account spend history; a low-tier account has tight RPM/TPM.
  Design: sequential ingest, exponential backoff on 429. Check actual tier in the dashboard
  before Phase 3.
- **Budget guardrails:** set a monthly usage cap in the OpenAI dashboard; app enforces a
  per-session token budget. $50 must be un-drainable by one runaway loop.

## Anthropic (via bundled claude-api skill, cached 2026-06) — SUPERSEDED by the free-pipeline
constraint; kept as the upgrade path (native page citations + 600-page PDF requests)

- Model: `claude-opus-4-8` ($5/M in, $25/M out, 1M context, 128K out). Adaptive thinking
  (`{type:"adaptive"}`); no `temperature`/`budget_tokens` (400).
- PDF: `document` content block, base64 or Files API (`files-api-2025-04-14` beta); 32 MB /
  600 pages per request → chunk compile calls by page span.
- Citations: `citations:{enabled:true}` per document → `page_location` (1-indexed) in response.
  **Incompatible with structured outputs in the same request.**
- Structured outputs: `output_config.format` json_schema (or `messages.parse()`).
- Prompt caching: `cache_control:{type:"ephemeral", ttl:"1h"}`; reads ~0.1×, 1h writes 2×;
  verify with `usage.cache_read_input_tokens`.
- Token sizing: `client.messages.count_tokens()` (decides Q&A Tier A vs B per session).

## Known gaps / re-verify before coding

- storage-js signatures pulled from `main` source (SPA docs 404 on plain fetch) — pin the
  supabase-js version and re-check at Phase 1.
- 1800s Vercel duration is beta — ingest must fit 300s (Hobby) / 800s (Pro) per invocation.
- Supabase Free 50 MB cap vs bigger lecture packs → Supabase Pro decision deferred to launch.
