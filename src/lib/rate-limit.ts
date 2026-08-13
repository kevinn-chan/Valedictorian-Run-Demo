// ponytail: in-memory per-instance limiter — resets on cold start and isn't
// shared across regions, but this app has two users and one login endpoint;
// upgrade to Upstash/Redis if it ever needs to survive distributed abuse.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > MAX_ATTEMPTS;
}
