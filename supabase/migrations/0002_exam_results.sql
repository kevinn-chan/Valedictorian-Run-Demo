-- Persist mock-exam attempts so scores survive a page refresh and build a
-- history. Same RLS shape as the other child tables (owns_session helper).

create table public.exam_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  score int not null,
  total int not null,
  taken_at timestamptz not null default now()
);
create index exam_results_session on public.exam_results (session_id, taken_at desc);

alter table public.exam_results enable row level security;

create policy "own exam_results" on public.exam_results
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
