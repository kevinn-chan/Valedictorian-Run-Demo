-- 0012 recorded every attempt, including refused ones, before comparing the
-- count. A key over its limit therefore stayed over it for as long as anyone
-- kept retrying inside the window: one request every 20 minutes, from any
-- address, held the 3-per-hour login cap shut for a real user indefinitely,
-- the exact lockout 0012 was written to prevent. The demo chat's global
-- ceiling had the same shape.
--
-- This lands as its own migration rather than an edit to 0012 because 0012 was
-- already applied in production, and `supabase db push` never re-runs an
-- applied version.
--
-- Same signature, so CREATE OR REPLACE keeps the existing grants; they are
-- restated below anyway so this file is correct on its own.

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  -- Serialize callers of the same key; released at transaction end.
  perform pg_advisory_xact_lock(hashtext(p_key));

  -- Global sweep: rotating IPs grow the key space quickly. The horizon must
  -- stay longer than the longest window any caller uses (currently 1 hour).
  delete from public.rate_limits where at < now() - interval '2 hours';

  delete from public.rate_limits
   where key = p_key
     and at < now() - make_interval(secs => p_window_seconds);

  select count(*) into n from public.rate_limits where key = p_key;

  -- Record only attempts that are let through; a refusal costs the caller a
  -- 429 and nothing else.
  if n >= p_max then
    return true;
  end if;

  insert into public.rate_limits (key) values (p_key);
  return false;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int) from public;
revoke execute on function public.check_rate_limit(text, int, int) from anon;
revoke execute on function public.check_rate_limit(text, int, int) from authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
