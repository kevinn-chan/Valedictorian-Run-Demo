-- Supabase advisor pass (2026-08-17): perf + defense-in-depth + drift cleanup.
-- Confirmed against a real `supabase db dump` of prod, not guessed.

-- Perf: auth.uid() was called per-row instead of once per query.
-- (Live policy is named "own rows" — differs from 0005_mastery_snapshots.sql's
-- source text, itself a small piece of drift the db dump caught.)
drop policy "own rows" on mastery_snapshots;
create policy "own rows" on mastery_snapshots
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Neither function is meant to be called directly via /rest/v1/rpc/... —
-- enforce_email_allowlist() only runs as an auth.users insert trigger, and
-- owns_session() only exists to back RLS policies. Postgres grants EXECUTE
-- to PUBLIC by default on creation; revoke it since nothing legitimate uses
-- the direct call path.
revoke execute on function public.enforce_email_allowlist() from public, authenticated;
revoke execute on function public.owns_session(uuid) from public, authenticated;

-- allowed_emails: RLS is enabled with zero policies, which is intentional —
-- default-deny for every role except the table owner, and
-- enforce_email_allowlist() (SECURITY DEFINER, owner privileges) is the only
-- thing that ever needs to read it. Do not add a policy "to silence the
-- advisor" — that would be a regression, not a fix.

-- rls_auto_enable(): a first attempt to drop this as dead code failed —
-- Postgres reported a live event trigger, "ensure_rls", genuinely depends on
-- it (`pg_dump` never surfaces event triggers without a superuser role, which
-- is why it looked orphaned from a schema dump; the dependency error is the
-- real signal). It's active infrastructure: auto-enables RLS on any newly
-- created public table. Its return type (event_trigger) means Postgres
-- refuses direct invocation outside event-trigger context regardless of
-- grants — so, same as the other two, there's no legitimate direct-call path
-- to leave open. Revoke, don't drop.
revoke execute on function public.rls_auto_enable() from public, authenticated;

-- Unindexed foreign keys (confirmed via schema dump, not the cropped advisor
-- screenshot — turned out to be 8 tables, not 1).
create index if not exists chats_session on public.chats (session_id);
create index if not exists chunks_file on public.chunks (file_id);
create index if not exists figures_file on public.figures (file_id);
create index if not exists files_session on public.files (session_id);
create index if not exists learning_plans_session on public.learning_plans (session_id);
create index if not exists messages_chat on public.messages (chat_id);
create index if not exists reviews_card on public.reviews (card_id);
create index if not exists sessions_user on public.sessions (user_id);
