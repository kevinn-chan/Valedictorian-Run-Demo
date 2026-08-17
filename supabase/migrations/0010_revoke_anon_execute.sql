-- Follow-up to 0009: that migration revoked EXECUTE from `public` (Postgres's
-- built-in pseudo-role) and `authenticated`, but Supabase's advisor "Public
-- Can Execute" category actually means the `anon` role — PostgREST's
-- unauthenticated caller — which is a distinct explicit grant, not covered
-- by revoking from PUBLIC. Confirmed via `supabase db dump`: all three
-- functions still had `GRANT ... TO anon` live after 0009 ran. Closing that
-- gap here.
revoke execute on function public.enforce_email_allowlist() from anon;
revoke execute on function public.owns_session(uuid) from anon;
revoke execute on function public.rls_auto_enable() from anon;
