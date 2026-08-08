"use client";

const SHORTCUTS = [
  { keys: ["Space"], desc: "Flip flashcard" },
  { keys: ["1"], desc: "Grade Again" },
  { keys: ["2"], desc: "Grade Good" },
  { keys: ["3"], desc: "Grade Easy" },
  { keys: ["u"], desc: "Undo last grade" },
  { keys: ["/"], desc: "Focus search" },
  { keys: ["g", "d"], desc: "Go to dashboard" },
  { keys: ["g", "r"], desc: "Go to review" },
  { keys: ["?"], desc: "Show this help" },
];

export function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg animate-slide-up"
        style={{ boxShadow: "var(--shadow-soft)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
          >
            Esc
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.desc}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border bg-secondary px-2 py-0.5 font-sans text-xs font-medium"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
