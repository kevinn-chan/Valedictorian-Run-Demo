"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Neighbor {
  slug: string;
  title: string;
}

// Prev/next between sibling wiki pages, with ← / → keyboard shortcuts.
export function WikiNav({
  sessionId,
  prev,
  next,
}: {
  sessionId: string;
  prev: Neighbor | null;
  next: Neighbor | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack arrows while typing or with modifiers held.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowLeft" && prev)
        router.push(`/sessions/${sessionId}/wiki/${prev.slug}`);
      if (e.key === "ArrowRight" && next)
        router.push(`/sessions/${sessionId}/wiki/${next.slug}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionId, prev, next, router]);

  if (!prev && !next) return null;

  return (
    <nav className="mt-12 flex items-stretch gap-3 border-t pt-6">
      {prev ? (
        <Link
          href={`/sessions/${sessionId}/wiki/${prev.slug}`}
          className="card-lift group flex flex-1 items-center gap-2 rounded-xl border bg-card px-4 py-3"
        >
          <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="block truncate text-sm font-medium group-hover:text-primary">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link
          href={`/sessions/${sessionId}/wiki/${next.slug}`}
          className="card-lift group flex flex-1 items-center justify-end gap-2 rounded-xl border bg-card px-4 py-3 text-right"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="block truncate text-sm font-medium group-hover:text-primary">
              {next.title}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
