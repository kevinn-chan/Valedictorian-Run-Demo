"use client";

import { useCallback, useRef, useState } from "react";
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

type Interaction =
  | null
  | { kind: "draw"; origin: { x: number; y: number } }
  | { kind: "move"; idx: number; origin: { x: number; y: number }; orig: Region }
  | { kind: "resize"; idx: number; corner: string; origin: { x: number; y: number }; orig: Region };

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
  const interaction = useRef<Interaction>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");

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

  function frac(e: React.PointerEvent) {
    const box = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (e.clientY - box.top) / box.height)),
    };
  }

  // Drawing new regions on the background capture layer
  function onBgDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = frac(e);
    interaction.current = { kind: "draw", origin: p };
    setDraft({ x: p.x, y: p.y, w: 0, h: 0, label: "" });
  }

  // Move: drag the region body
  function onRegionDown(e: React.PointerEvent, idx: number) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    interaction.current = { kind: "move", idx, origin: frac(e), orig: { ...regions[idx] } };
  }

  // Resize: drag a corner handle
  function onHandleDown(e: React.PointerEvent, idx: number, corner: string) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    interaction.current = { kind: "resize", idx, corner, origin: frac(e), orig: { ...regions[idx] } };
  }

  function onGlobalMove(e: React.PointerEvent) {
    const act = interaction.current;
    if (!act) return;
    const p = frac(e);

    if (act.kind === "draw") {
      const s = act.origin;
      setDraft({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
        label: "",
      });
    } else if (act.kind === "move") {
      const dx = p.x - act.origin.x;
      const dy = p.y - act.origin.y;
      setRegions((rs) =>
        rs.map((r, i) =>
          i === act.idx
            ? { ...r, x: Math.max(0, Math.min(1 - r.w, act.orig.x + dx)), y: Math.max(0, Math.min(1 - r.h, act.orig.y + dy)) }
            : r
        )
      );
    } else if (act.kind === "resize") {
      const { orig, corner } = act;
      setRegions((rs) =>
        rs.map((r, i) => {
          if (i !== act.idx) return r;
          let { x, y, w, h } = orig;
          if (corner.includes("e")) w = Math.max(0.01, p.x - x);
          if (corner.includes("w")) { w = Math.max(0.01, (x + w) - p.x); x = Math.min(p.x, x + orig.w - 0.01); }
          if (corner.includes("s")) h = Math.max(0.01, p.y - y);
          if (corner.includes("n")) { h = Math.max(0.01, (y + h) - p.y); y = Math.min(p.y, y + orig.h - 0.01); }
          return { ...r, x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
        })
      );
    }
  }

  function onGlobalUp() {
    const act = interaction.current;
    interaction.current = null;
    if (act?.kind === "draw" && draft && draft.w > 0.01 && draft.h > 0.01) {
      setRegions((r) => [...r, draft]);
    }
    setDraft(null);
  }

  // Auto-save a single region when its label blurs with text
  const saveOne = useCallback(
    async (idx: number) => {
      const r = regions[idx];
      if (!r || !r.label.trim() || saved.has(idx)) return;
      const res = await fetch(`/api/occlude/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figureId: figure.id, regions: [r] }),
      });
      if (res.ok) {
        setSaved((s) => new Set(s).add(idx));
        router.refresh();
      }
    },
    [regions, saved, sessionId, figure.id, router]
  );

  async function saveAll() {
    const unsaved = regions.filter((r, i) => r.label.trim() && !saved.has(i));
    if (!unsaved.length) {
      setMsg("Nothing new to save.");
      return;
    }
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/occlude/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ figureId: figure.id, regions: unsaved }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setMsg(j?.error ?? "Save failed.");
      return;
    }
    const { created } = await res.json();
    const allSaved = new Set(regions.map((_, i) => i));
    setSaved(allSaved);
    router.refresh();
    setMsg(`Created ${created} card${created === 1 ? "" : "s"}.`);
  }

  const pct = (n: number) => `${n * 100}%`;
  const CORNERS = ["nw", "ne", "sw", "se"];
  const CURSOR: Record<string, string> = { nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize" };
  const cornerPos = (c: string) => ({
    top: c.includes("n") ? "-4px" : undefined,
    bottom: c.includes("s") ? "-4px" : undefined,
    left: c.includes("w") ? "-4px" : undefined,
    right: c.includes("e") ? "-4px" : undefined,
  });

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
          Draw a box, move it, or drag corners to resize. Labels auto-save on blur.
        </p>
        <button
          onClick={suggest}
          disabled={suggesting}
          className="rounded-md border px-2.5 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {suggesting ? "Finding labels…" : "✨ Suggest regions"}
        </button>
      </div>

      <div
        className="relative mt-3 inline-block select-none touch-none"
        onPointerMove={onGlobalMove}
        onPointerUp={onGlobalUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={`/api/figure/${figure.id}`}
          alt={figure.caption ?? "figure"}
          draggable={false}
          className="max-h-[60vh] w-auto rounded-lg border"
        />
        {/* Background draw layer */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={onBgDown}
        />
        {/* Existing regions with move + resize */}
        {regions.map((r, i) => (
          <div
            key={i}
            className={`absolute flex cursor-move items-center justify-center rounded text-[10px] font-semibold text-primary-foreground ${
              saved.has(i) ? "bg-green-600/80" : "bg-primary/80"
            }`}
            style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }}
            onPointerDown={(e) => onRegionDown(e, i)}
          >
            {i + 1}
            {CORNERS.map((c) => (
              <div
                key={c}
                className="absolute size-2.5 rounded-sm bg-white ring-1 ring-primary"
                style={{ cursor: CURSOR[c], ...cornerPos(c) }}
                onPointerDown={(e) => onHandleDown(e, i, c)}
              />
            ))}
          </div>
        ))}
        {/* Draft being drawn */}
        {draft && (
          <div
            className="pointer-events-none absolute rounded bg-primary/60"
            style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h) }}
          />
        )}
      </div>

      {regions.length > 0 && (
        <ul className="mt-4 space-y-2">
          {regions.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground ${
                saved.has(i) ? "bg-green-600" : "bg-primary"
              }`}>
                {saved.has(i) ? "✓" : i + 1}
              </span>
              <input
                value={r.label}
                onChange={(e) =>
                  setRegions((rs) =>
                    rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                  )
                }
                onBlur={() => saveOne(i)}
                placeholder="What's under this box?"
                disabled={saved.has(i)}
                className="h-9 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60"
              />
              {!saved.has(i) && (
                <button
                  onClick={() => {
                    setRegions((rs) => rs.filter((_, j) => j !== i));
                    setSaved((s) => {
                      const next = new Set<number>();
                      for (const v of s) if (v < i) next.add(v); else if (v > i) next.add(v - 1);
                      return next;
                    });
                  }}
                  className="text-xs text-muted-foreground hover:text-red-600"
                >
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={busy || !regions.some((r, i) => r.label.trim() && !saved.has(i))}
          className="btn-squish rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save all"}
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
