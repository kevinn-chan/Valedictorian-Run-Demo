"use client";

import { useEffect } from "react";

export function PageViewer({
  fileId,
  page,
  onClose,
}: {
  fileId: string;
  page: number;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-lg animate-slide-up"
        style={{ boxShadow: "var(--shadow-soft)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Source · p. {page}</span>
          <button
            onClick={onClose}
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
