import { createClient } from "@supabase/supabase-js";

// Two layers. The in-memory one is a free first gate that catches a burst
// hitting the same warm instance; it cannot be trusted on its own, because
// every serverless instance keeps its own Map and a cold start empties it.
// The durable one counts in Postgres, so the limit holds across instances,
// regions and restarts. Both must pass.

const attempts = new Map<string, number[]>();

/** Per-instance gate. Cheap, best-effort, never the only thing in the way. */
export function isRateLimited(
  key: string,
  max = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  // Only allowed attempts are recorded. Counting refusals too would let anyone
  // hold a key shut indefinitely by retrying inside the window.
  const limited = recent.length >= max;
  if (!limited) recent.push(now);
  attempts.set(key, recent);
  return limited;
}

/**
 * Shared gate, counted in Postgres via check_rate_limit (migration 0012).
 *
 * Fails CLOSED. If the database cannot be reached the caller is treated as
 * limited, which costs a legitimate visitor a retry but never hands an
 * attacker an unbounded allowance. For the login route that trade is free:
 * Supabase Auth is the same infrastructure, so a database it cannot reach is
 * one where the sign-in email was not going to be sent anyway.
 */
export async function isRateLimitedDurable(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (isRateLimited(key, max, windowSeconds * 1000)) return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return true;

  try {
    const admin = createClient(url, serviceKey);
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // The function genuinely not existing is a deploy-ordering state, not an
      // outage: migrations run in CI on push to main, and Vercel usually wins
      // that race, so for a minute or two this code is live against a schema
      // that has not caught up. Failing closed there would lock everyone out of
      // login for no security benefit — the in-memory gate above already ran
      // and already said no. Fall back to it. PGRST202 is PostgREST's
      // "function not found in schema cache".
      const missing =
        error.code === "PGRST202" ||
        /could not find the function/i.test(error.message ?? "");
      if (missing) return false;

      // Anything else (unreachable, permission denied, timeout) fails closed.
      return true;
    }
    return data === true;
  } catch {
    return true;
  }
}
