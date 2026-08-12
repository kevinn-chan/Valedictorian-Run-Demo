-- Cross-session weekly plan: unlike learning_plans (one per session), this
-- belongs to the user directly, so it can interleave topics across every
-- session they own.
create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  markdown text not null,
  inputs jsonb,
  generated_at timestamptz not null default now()
);
create index study_plans_user on public.study_plans (user_id, generated_at desc);

alter table public.study_plans enable row level security;
create policy "own study plans" on public.study_plans
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
