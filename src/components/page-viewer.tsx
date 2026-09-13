"use client";

import { useEffect, useRef } from "react";

// Inline source-page preview for every citation chip (wiki, chat, teach back,
// demo), so a "p. N" behaves the same wherever it appears.
export function PageViewer({
  fileId,
  page,
  onClose,
}: {
  fileId: string;
  page: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Callers pass inline arrows; a ref keeps the effect mount-only so a parent
  // re-render doesn't re-steal focus.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
      // Only one focusable control inside: keep Tab from leaving the dialog.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-viewer-title"
        className="max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-lg animate-slide-up"
        style={{ boxShadow: "var(--shadow-soft)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span id="page-viewer-title" className="text-sm font-semibold">
            Source · p. {page}
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close source preview"
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
          >
            Esc
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/file/${fileId}/page/${page}`}
          alt={`Source page ${page}`}
          className="max-h-[calc(90vh-45px)] w-full bg-white object-contain"
        />
      </div>
    </div>
  );
}
