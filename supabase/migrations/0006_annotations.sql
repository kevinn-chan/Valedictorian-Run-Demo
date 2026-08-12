-- Solo margin-notes on wiki topics: quote + note pairs, not shared between
-- users (sessions are single-owner — see owns_session()). No inline
-- highlight-on-reload; just a list under the topic content.
create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  wiki_slug text not null,
  quote text not null,
  note text not null,
  created_at timestamptz not null default now()
);
create index annotations_session_slug on public.annotations (session_id, wiki_slug);

alter table public.annotations enable row level security;
create policy "own annotations" on public.annotations
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
