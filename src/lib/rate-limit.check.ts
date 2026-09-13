// Self-check for the in-memory gate. Run: `node src/lib/rate-limit.check.ts`
//
// Only the per-instance layer is exercised here; isRateLimitedDurable needs a
// database and is checked against a real one. What matters locally is that the
// window and the cap behave, because this layer is what a burst hits first.
import assert from "node:assert";
import { isRateLimited } from "./rate-limit.ts";

// Default policy is 5 per 60s: the 6th call in a window is the one refused.
const k = `check:${Math.random()}`;
for (let i = 1; i <= 5; i++) {
  assert.equal(isRateLimited(k), false, `call ${i} of 5 should pass`);
}
assert.equal(isRateLimited(k), true, "6th call inside the window is limited");
assert.equal(isRateLimited(k), true, "and it stays limited");

// Keys are independent — one caller being limited must not limit anyone else.
assert.equal(isRateLimited(`other:${Math.random()}`), false);

// A custom cap is respected.
const k2 = `check2:${Math.random()}`;
assert.equal(isRateLimited(k2, 2, 60_000), false);
assert.equal(isRateLimited(k2, 2, 60_000), false);
assert.equal(isRateLimited(k2, 2, 60_000), true, "3rd call with max=2 is limited");

// Entries outside the window are forgotten: with a 1ms window every call is
// the only one in its own window, so nothing is ever limited.
const k3 = `check3:${Math.random()}`;
for (let i = 0; i < 8; i++) {
  assert.equal(isRateLimited(k3, 1, 0), false, "a zero-length window never limits");
}

// Refused attempts are not recorded, so retrying while limited cannot keep a
// key shut. With a 50ms window: fill it, hammer it while limited, then once the
// allowed attempts age out the key opens — regardless of the refusals.
const k4 = `check4:${Math.random()}`;
assert.equal(isRateLimited(k4, 2, 50), false);
assert.equal(isRateLimited(k4, 2, 50), false);
const until = Date.now() + 40;
while (Date.now() < until) assert.equal(isRateLimited(k4, 2, 50), true, "limited while the window is full");
const reopen = Date.now() + 15;
while (Date.now() < reopen) { /* let the two allowed attempts age out */ }
assert.equal(isRateLimited(k4, 2, 50), false, "refusals did not extend the lockout");

// The window is per-key and not shared with the default one used above.
assert.equal(isRateLimited(k, 100, 60_000), false, "a higher cap on the same key passes");

console.log("rate-limit self-check passed");
