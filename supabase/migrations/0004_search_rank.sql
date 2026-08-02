-- Valedictorian Run — search ranking (ts_rank) + per-session filter
-- PostgREST's .textSearch() can express the @@ match but not the ts_rank ordering,
-- so cross-session search goes through this RPC instead. Deliberately NOT
-- `security definer`: the function runs as the caller, so the existing
-- "own chunks" RLS policy (public.owns_session(session_id)) still scopes every
-- row to the signed-in owner exactly as the old direct table query did.
-- p_session_id is the optional per-session filter chip; null = every session.

create or replace function public.search_chunks(q text, p_session_id uuid default null)
returns table (
  session_id uuid,
  file_id uuid,
  page_from int,
  page_to int,
  text text,
  rank real
)
language sql
stable
set search_path = public
as $$
  select c.session_id, c.file_id, c.page_from, c.page_to, c.text,
         ts_rank(c.tsv, websearch_to_tsquery('english', q)) as rank
  from public.chunks c
  where c.tsv @@ websearch_to_tsquery('english', q)
    and (p_session_id is null or c.session_id = p_session_id)
  -- ordered by the expression, not the alias: in a sql-language function the
  -- RETURNS TABLE column names are also parameters, so `order by rank` would be
  -- an ambiguous reference.
  order by ts_rank(c.tsv, websearch_to_tsquery('english', q)) desc
  limit 50;
$$;

-- PostgREST discovers new functions from its schema cache.
notify pgrst, 'reload schema';
