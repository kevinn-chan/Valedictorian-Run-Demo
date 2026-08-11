create table mastery_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  snapshot_date date not null default current_date,
  total_cards int not null,
  mastered_cards int not null,
  unique (user_id, snapshot_date)
);

alter table mastery_snapshots enable row level security;

create policy "Users can manage own snapshots"
  on mastery_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
