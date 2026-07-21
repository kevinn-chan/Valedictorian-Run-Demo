-- Valedictorian Run — initial schema (PLAN.md §3)

-- ============ allowlist (2-user design) ============
create table public.allowed_emails (
  email text primary key
);
insert into public.allowed_emails (email) values ('you@example.com');

-- Reject any signup whose email is not allowlisted. Belt: middleware also checks
-- ALLOWED_EMAILS; this trigger is the braces (enforced even if middleware is bypassed).
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Signups are restricted on this app.';
  end if;
  return new;
end;
$$;

create trigger enforce_email_allowlist
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-- ============ core tables ============
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  goal_text text,
  exam_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  storage_path text not null,
  name text not null,
  mime text not null,
  pages int,
  bytes bigint,
  ingest_status text not null default 'pending', -- pending|processing|done|error
  created_at timestamptz not null default now()
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  page_from int not null,
  page_to int not null,
  text text not null,
  tsv tsvector generated always as (to_tsvector('english', text)) stored
);
create index chunks_tsv on public.chunks using gin (tsv);
create index chunks_session on public.chunks (session_id);

create table public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  slug text not null,
  kind text not null, -- file_digest|topic|glossary|formula_sheet|index
  title text not null,
  markdown text not null,
  source_refs jsonb,
  updated_at timestamptz not null default now(),
  unique (session_id, slug)
);

create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  markdown text not null,
  inputs jsonb,
  generated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  topic_slug text,
  front text not null,
  back text not null,
  source_ref jsonb,
  -- SM-2 lite state (ponytail: upgrade to FSRS only if retention data demands it)
  interval_days real not null default 0,
  ease real not null default 2.5,
  reps int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now()
);
create index cards_due on public.cards (session_id, due_at);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null, -- user|assistant
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  grade text not null, -- again|good|easy
  reviewed_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.allowed_emails enable row level security; -- no policies: server-only
alter table public.sessions enable row level security;
alter table public.files enable row level security;
alter table public.chunks enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.learning_plans enable row level security;
alter table public.cards enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

create policy "own sessions" on public.sessions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- helper predicate reused by child-table policies
create or replace function public.owns_session(sid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.sessions s where s.id = sid and s.user_id = auth.uid()) $$;

create policy "own files" on public.files
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own chunks" on public.chunks
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own wiki" on public.wiki_pages
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own plans" on public.learning_plans
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own cards" on public.cards
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own chats" on public.chats
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own messages" on public.messages
  for all using (exists (select 1 from public.chats c where c.id = chat_id and public.owns_session(c.session_id)))
  with check (exists (select 1 from public.chats c where c.id = chat_id and public.owns_session(c.session_id)));
create policy "own reviews" on public.reviews
  for all using (exists (select 1 from public.cards k where k.id = card_id and public.owns_session(k.session_id)))
  with check (exists (select 1 from public.cards k where k.id = card_id and public.owns_session(k.session_id)));

-- ============ storage bucket (session files) ============
insert into storage.buckets (id, name, public) values ('session-files', 'session-files', false);

create policy "own storage objects read" on storage.objects
  for select using (bucket_id = 'session-files' and owner = (select auth.uid()));
create policy "own storage objects insert" on storage.objects
  for insert with check (bucket_id = 'session-files' and owner = (select auth.uid()));
create policy "own storage objects delete" on storage.objects
  for delete using (bucket_id = 'session-files' and owner = (select auth.uid()));
