// Self-check for image-occlusion card building. Run: `node src/lib/occlusion.check.ts`
import assert from "node:assert";
import { buildOcclusionCards, boxToRect, type Region } from "./occlusion.ts";

// boxToRect: Gemini [ymin, xmin, ymax, xmax] @0-1000 → 0..1 {x,y,w,h}.
const rect = boxToRect([100, 200, 400, 700]); // y:100-400, x:200-700
assert.equal(rect.x, 0.2);
assert.equal(rect.y, 0.1);
assert.equal(rect.w, 0.5, "w = (700-200)/1000");
assert.equal(rect.h, 0.3, "h = (400-100)/1000");
// Reversed corners still yield a positive, clamped rect.
const rev = boxToRect([400, 700, 100, 200]);
assert.equal(rev.x, 0.2);
assert.equal(rev.w, 0.5);
// Out-of-range coords clamp into 0..1.
assert.equal(boxToRect([-50, -50, 1200, 1200]).x, 0);
assert.equal(boxToRect([-50, -50, 1200, 1200]).w, 1);

const r = (o: Partial<Region>): Region => ({
  x: 0.1,
  y: 0.1,
  w: 0.2,
  h: 0.1,
  label: "aorta",
  ...o,
});

const rows = buildOcclusionCards("sess", "fig", "topic-1", "Heart cross-section", [
  r({ label: "aorta" }),
  r({ label: "  " }), // empty → dropped
  r({ label: "vena cava", w: 0.001 }), // too small → dropped
  r({ label: "left ventricle", x: 1.5 }), // out-of-range x → clamped to 1
]);

assert.equal(rows.length, 2, "empty and degenerate regions dropped");
assert.equal(rows[0].back, "aorta");
assert.equal(rows[0].source_ref.kind, "occlusion");
assert.equal(rows[0].source_ref.figureId, "fig");
assert.equal(rows[0].topic_slug, "topic-1");
assert.ok(rows[0].front.includes("Heart cross-section"), "caption in prompt");
assert.equal(rows[1].source_ref.rect.x, 1, "out-of-range x clamped to 1");

// No caption → generic prompt.
const noCap = buildOcclusionCards("s", "f", null, null, [r({})]);
assert.equal(noCap[0].front, "What is hidden here?");
assert.equal(noCap[0].topic_slug, null);

console.log("occlusion.check: all assertions passed");
