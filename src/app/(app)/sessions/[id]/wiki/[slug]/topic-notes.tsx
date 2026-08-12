"use client";

import { useEffect, useRef, useState } from "react";

interface Note {
  id: string;
  quote: string;
  note: string;
  created_at: string;
}

// Solo margin-notes: select text in the topic body, leave yourself a note.
// No inline highlight-on-reload (fragile against markdown re-renders) — notes
// list as quote+note pairs below the content instead.
export function TopicNotes({
  sessionId,
  wikiSlug,
  initialNotes,
  children,
}: {
  sessionId: string;
  wikiSlug: string;
  initialNotes: Note[];
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [popover, setPopover] = useState<{ x: number; y: number; quote: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!popover) return;
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-note-popover]")) setPopover(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [popover]);

  function onMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!sel || !text || sel.rangeCount === 0 || !containerRef.current) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();
    setDraft("");
    setPopover({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top,
      quote: text.slice(0, 300),
    });
  }

  async function save() {
    if (!popover || !draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, wikiSlug, quote: popover.quote, note: draft.trim() }),
      });
      const data = await res.json();
      if (data.note) {
        setNotes((n) => [...n, data.note]);
        setPopover(null);
        window.getSelection()?.removeAllRanges();
      }
    } finally {
      setSaving(false);
    }
  }

  function remove(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    fetch(`/api/annotations/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div ref={containerRef} className="relative" onMouseUp={onMouseUp}>
        {children}
        {popover && (
          <div
            data-note-popover
            className="absolute z-10 w-64 rounded-xl border bg-card p-3 shadow-lg"
            style={{ left: popover.x, top: popover.y, transform: "translate(-50%, -100%)" }}
          >
            <p className="mb-1.5 line-clamp-2 text-xs italic text-muted-foreground">
              &ldquo;{popover.quote}&rdquo;
            </p>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Leave yourself a note…"
              rows={2}
              className="w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <button
                onClick={() => setPopover(null)}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !draft.trim()}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <section className="mt-8 max-w-[68ch]">
          <h2 className="text-sm font-semibold text-foreground">
            Your notes <span className="font-normal text-muted-foreground">· {notes.length}</span>
          </h2>
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border bg-card px-4 py-3">
                <p className="text-xs italic text-muted-foreground">&ldquo;{n.quote}&rdquo;</p>
                <p className="mt-1.5 text-sm leading-relaxed">{n.note}</p>
                <button
                  onClick={() => remove(n.id)}
                  className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
