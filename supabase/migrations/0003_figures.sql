-- Valedictorian Run — figures (visual-aware studying, P1)
-- Page images captured at ingest for pages that carry a real figure/diagram/graph.
-- Images live in the existing private session-files bucket, flat under the session
-- prefix ({sessionId}/fig_{fileTag}_p{page}.webp) so deleteSession cleans them up.

create table public.figures (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  page int not null,
  storage_path text not null,
  caption text,
  topic_slug text,        -- full wiki slug ({fileTag}-{topicSlug}), nullable
  kind text,              -- diagram|graph|chart|anatomy|table
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index figures_session on public.figures (session_id);
create index figures_topic on public.figures (session_id, topic_slug);

alter table public.figures enable row level security;
create policy "own figures" on public.figures
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
