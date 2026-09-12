"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { ProgressBar } from "@/components/ui-kit";

export type WikiTopic = {
  slug: string;
  title: string;
  firstPage: number | null;
  lastPage: number | null;
  cardCount: number;
  pct: number | null;
};

// A compiled course runs to 60-90 topics, so the flat A-Z grid made finding one
// a scan-the-wall task exactly when a student can least afford it. Filtering is
// client-side over the already-fetched list: no extra query, no new route.
export function TopicGrid({ sessionId, topics }: { sessionId: string; topics: WikiTopic[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () => (needle ? topics.filter((t) => t.title.toLowerCase().includes(needle)) : topics),
    [needle, topics]
  );

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">Topics</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {needle ? `${shown.length} of ${topics.length}` : topics.length}
        </span>
      </div>

      <div className="relative mt-4">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter topics by name"
          placeholder="Filter topics…"
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
        />
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No topic matches “{q.trim()}”. Every topic here is compiled from your own
          files, so try a word from the lecture rather than the exam.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/sessions/${sessionId}/wiki/${t.slug}`}
                prefetch={false}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpen className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                        {t.title}
                      </span>
                      {t.firstPage !== null && (
                        <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                          p. {t.firstPage}
                          {t.lastPage !== null && t.lastPage !== t.firstPage && `–${t.lastPage}`}
                        </span>
                      )}
                    </span>
                  </div>
                  {t.pct !== null && (
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t.cardCount} card{t.cardCount === 1 ? "" : "s"}
                        </span>
                        <span className="font-medium tabular-nums">
                          {Math.round(t.pct * 100)}%
                        </span>
                      </div>
                      <ProgressBar value={t.pct} className="mt-1.5" />
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
