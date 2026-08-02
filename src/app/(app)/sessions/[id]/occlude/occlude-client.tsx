"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@/lib/occlusion";

type Figure = { id: string; caption: string | null; page: number };

// Draw rectangles over a figure's labels; each becomes a hide-and-recall card.
// Coordinates are captured as fractions (0..1) of the image so they render at
// any size in review. No image editing, no server round-trip until Save.
export function OccludeClient({
  sessionId,
  figures,
}: {
  sessionId: string;
  figures: Figure[];
}) {
  const [figure, setFigure] = useState<Figure | null>(null);

  if (!figure) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {figures.map((f) => (
          <button
            key={f.id}
            onClick={() => setFigure(f)}
            className="card-soft card-lift group overflow-hidden text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/figure/${f.id}`}
              alt={f.caption ?? `figure p.${f.page}`}
              className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <p className="truncate px-3 py-2.5 text-xs text-muted-foreground">
              p.{f.page} · {f.caption ?? "figure"}
            </p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Editor
      sessionId={sessionId}
      figure={figure}
      onBack={() => setFigure(null)}
    />
  );
}

function Editor({
  sessionId,
  figure,
  onBack,
}: {
  sessionId: string;
  figure: Figure;
  onBack: () => void;
}) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [draft, setDraft] = useState<Region | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [msg, setMsg] = useState("");

  // Ask the vision model to find labels on the figure and pre-fill boxes to review.
  async function suggest() {
    setSuggesting(true);
    setMsg("");
    try {
      const res = await fetch(`/api/occlude/${sessionId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureId: figure.id }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(j?.error ?? "Couldn't suggest regions.");
        return;
      }
      const found: Region[] = j?.regions ?? [];
      if (!found.length) {
        setMsg("No labels detected — draw boxes manually.");
        return;
      }
      setRegions((prev) => {
        const seen = new Set(prev.map((r) => r.label.toLowerCase()));
        const fresh = found.filter((r) => {
          const key = r.label.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setMsg(`Suggested ${fresh.length} region${fresh.length === 1 ? "" : "s"} — review, edit, then save.`);
        return [...prev, ...fresh];
      });
    } finally {
      setSuggesting(false);
    }
  }

  // Pointer position as a fraction of the image box, clamped to it.
  function frac(e: React.PointerEvent) {
    const box = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)),
    };
  }

  function onDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = frac(e);
    start.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0, label: "" });
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    const p = frac(e);
    const s = start.current;
    setDraft({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
      label: "",
    });
  }
  function onUp() {
    start.current = null;
    if (draft && draft.w > 0.01 && draft.h > 0.01) {
      setRegions((r) => [...r, draft]);
    }
    setDraft(null);
  }

  async function save() {
    const valid = regions.filter((r) => r.label.trim());
    if (!valid.length) {
      setMsg("Label at least one box before saving.");
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/occlude/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ figureId: figure.id, regions: valid }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setMsg(j?.error ?? "Save failed.");
      return;
    }
    const { created } = await res.json();
    setRegions([]);
    router.refresh();
    setMsg(`Created ${created} occlusion card${created === 1 ? "" : "s"}.`);
  }

  const pct = (n: number) => `${n * 100}%`;

  return (
    <div className="mt-6">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Pick another figure
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">
          Drag across a label to cover it, or let the model find them.
        </p>
        <button
          onClick={suggest}
          disabled={suggesting}
          className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {suggesting ? "Finding labels…" : "✨ Suggest regions"}
        </button>
      </div>

      <div className="relative mt-3 inline-block select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={`/api/figure/${figure.id}`}
          alt={figure.caption ?? "figure"}
          draggable={false}
          className="max-h-[60vh] w-auto rounded-lg border"
        />
        {/* Transparent capture layer so the image never ghost-drags. */}
        <div
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        />
        {[...regions, ...(draft ? [draft] : [])].map((r, i) => (
          <div
            key={i}
            className="pointer-events-none absolute flex items-center justify-center rounded bg-primary/80 text-[10px] font-semibold text-primary-foreground"
            style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }}
          >
            {i < regions.length ? i + 1 : ""}
          </div>
        ))}
      </div>

      {regions.length > 0 && (
        <ul className="mt-4 space-y-2">
          {regions.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <input
                value={r.label}
                onChange={(e) =>
                  setRegions((rs) =>
                    rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                  )
                }
                placeholder="What's under this box?"
                className="h-9 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary/50"
              />
              <button
                onClick={() => setRegions((rs) => rs.filter((_, j) => j !== i))}
                className="text-xs text-muted-foreground hover:text-red-600"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !regions.length}
          className="btn-squish rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save cards"}
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
