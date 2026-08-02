import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  EyeOff,
  GraduationCap,
  Layers,
  MessageCircleQuestion,
  Presentation,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./uploader";
import { CompileButton } from "./compile-button";
import { CardsButton } from "./cards-button";
import { StatusPoller } from "./status-poller";
import { RenameTitle } from "./rename-title";
import { ExamCountdown } from "./exam-countdown";
import { ProgressBar, ProgressRing } from "@/components/ui-kit";

const CHIP: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  processing: "bg-blue-500/15 text-blue-700",
  done: "bg-emerald-500/15 text-emerald-700",
  error: "bg-red-500/15 text-red-700",
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // One round-trip group instead of four sequential ones — none of these
  // depend on each other's results, so they fan out in parallel.
  const nowIso = new Date().toISOString();
  const [
    { data: session },
    { data: files },
    { count: dueCount },
    { data: topicPages },
    { data: topicCards },
    { count: figureCount },
  ] = await Promise.all([
    supabase.from("sessions").select("id, title, exam_date").eq("id", id).single(),
    supabase
      .from("files")
      .select("id, name, bytes, pages, ingest_status, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id)
      .lte("due_at", nowIso),
    supabase
      .from("wiki_pages")
      .select("slug, title")
      .eq("session_id", id)
      .eq("kind", "topic")
      .order("title"),
    supabase
      .from("cards")
      .select("topic_slug, reps, lapses")
      .eq("session_id", id),
    supabase
      .from("figures")
      .select("*", { count: "exact", head: true })
      .eq("session_id", id),
  ]);
  if (!session) notFound();

  // Total card count is just the rows we already fetched — no extra query.
  const cards = topicCards ?? [];
  const cardCount = cards.length;
  const mastered = cards.filter((c) => c.reps >= 2).length;
  const masteryPct = cardCount ? mastered / cardCount : 0;
  const topicCount = topicPages?.length ?? 0;
  const pageCount = (files ?? []).reduce((n, f) => n + (f.pages ?? 0), 0);

  const compiled = files?.some((f) => f.ingest_status === "done");
  const compiling = files?.some(
    (f) => f.ingest_status === "pending" || f.ingest_status === "processing"
  );

  const base = `/sessions/${session.id}`;
  const tabGroups = [
    {
      label: "Study",
      tabs: [
        {
          href: "wiki",
          label: "Wiki",
          sub: `${topicCount} topic${topicCount === 1 ? "" : "s"}`,
          Icon: BookOpen,
        },
        ...(cardCount > 0
          ? [
              {
                href: "review",
                label: "Review",
                sub: dueCount ? `${dueCount} due now` : "All caught up",
                Icon: Layers,
                hot: (dueCount ?? 0) > 0,
              },
            ]
          : []),
        {
          href: "chat",
          label: "Ask",
          sub: "Cited answers",
          Icon: MessageCircleQuestion,
        },
      ],
    },
    {
      label: "Practice",
      tabs: [
        {
          href: "teach",
          label: "Teach back",
          sub: "Explain from memory",
          Icon: Presentation,
        },
        {
          href: "quiz",
          label: "Mock exam",
          sub: "10 questions",
          Icon: GraduationCap,
        },
        ...((figureCount ?? 0) > 0
          ? [
              {
                href: "occlude",
                label: "Occlusion",
                sub: `${figureCount} figure${figureCount === 1 ? "" : "s"}`,
                Icon: EyeOff,
              },
            ]
          : []),
      ],
    },
    {
      label: "Track",
      tabs: [
        {
          href: "plan",
          label: "Learning plan",
          sub: "Dated schedule",
          Icon: CalendarRange,
        },
        ...(cardCount > 0
          ? [
              {
                href: "analytics",
                label: "Progress",
                sub: `${Math.round(masteryPct * 100)}% mastered`,
                Icon: TrendingUp,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      {compiling && <StatusPoller />}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> All sessions
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <RenameTitle id={session.id} title={session.title} />
          <p className="mt-1.5 text-sm text-muted-foreground">
            {files?.length ?? 0} file{files?.length === 1 ? "" : "s"}
            {pageCount > 0 && ` · ${pageCount} pages`}
            {topicCount > 0 && ` · ${topicCount} topics`}
            {cardCount > 0 && ` · ${cardCount} cards`}
          </p>
          <div className="mt-3">
            <ExamCountdown sessionId={session.id} examDate={session.exam_date} />
          </div>
          {compiled && (
            <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <a
                href={`/api/export/${session.id}/wiki`}
                className="transition-colors hover:text-foreground"
              >
                Export wiki
              </a>
              {cardCount > 0 && (
                <a
                  href={`/api/export/${session.id}/cards`}
                  className="transition-colors hover:text-foreground"
                >
                  Export cards
                </a>
              )}
            </p>
          )}
        </div>

        {compiled && cardCount > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-3">
            <ProgressRing value={masteryPct} size={56} stroke={6}>
              <span className="text-xs font-semibold tabular-nums">
                {Math.round(masteryPct * 100)}%
              </span>
            </ProgressRing>
            <div>
              <p className="text-sm font-semibold">
                {mastered} of {cardCount} mastered
              </p>
              <p className="text-xs text-muted-foreground">
                {dueCount ? `${dueCount} due for review` : "Nothing due today"}
              </p>
            </div>
          </div>
        )}
      </div>

      {compiled && (
        <div className="mt-8 space-y-6">
          {tabGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.tabs.map(({ href, label, sub, Icon, hot }) => (
                  <Link
                    key={href}
                    href={`${base}/${href}`}
                    prefetch={false}
                    className={`group flex items-center gap-3.5 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] ${
                      hot
                        ? "border-primary/25 bg-primary/8"
                        : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        hot
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                      }`}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {sub}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="overflow-hidden rounded-2xl border bg-card"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Materials</h2>
            {compiled && (
              <CardsButton sessionId={session.id} hasCards={cardCount > 0} />
            )}
          </div>
          <div className="p-5">
            <Uploader sessionId={session.id} />
          </div>
          {files && files.length > 0 && (
            <ul className="border-t">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5 py-3 transition-colors last:border-b-0 hover:bg-secondary/30"
                >
                  {f.ingest_status === "done" ? (
                    <Link
                      href={`${base}/wiki/${f.id.slice(0, 8)}-digest`}
                      prefetch={false}
                      title="Open this file's digest"
                      className="min-w-0 flex-1 basis-full truncate text-sm font-medium hover:text-primary sm:basis-auto"
                    >
                      {f.name}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 basis-full truncate text-sm font-medium sm:basis-auto">
                      {f.name}
                    </span>
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {f.pages ? `${f.pages} pages` : ""}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatBytes(f.bytes)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      CHIP[f.ingest_status] ?? CHIP.pending
                    }`}
                  >
                    {f.ingest_status}
                  </span>
                  {(f.ingest_status === "pending" ||
                    f.ingest_status === "error") && (
                    <CompileButton fileId={f.id} />
                  )}
                  {f.ingest_status === "done" && (
                    <CompileButton fileId={f.id} recompile />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {topicPages && cardCount > 0 && (
          <aside
            className="rounded-2xl border bg-card p-5"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <h2 className="text-sm font-semibold">Topic mastery</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              From your review history — open one to revisit its notes.
            </p>
            <ul className="mt-4 space-y-3">
              {topicPages
                .map((t) => {
                  const cs = cards.filter((c) => c.topic_slug === t.slug);
                  return { ...t, cs, score: cs.filter((c) => c.reps >= 2).length };
                })
                .filter((t) => t.cs.length > 0)
                .sort((a, b) => a.score / a.cs.length - b.score / b.cs.length)
                .slice(0, 8)
                .map((t) => {
                  const pct = t.score / t.cs.length;
                  return (
                    <li key={t.slug}>
                      <Link
                        href={`${base}/wiki/${t.slug}`}
                        prefetch={false}
                        className="group block"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm transition-colors group-hover:text-primary">
                            {t.title}
                          </span>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                            {Math.round(pct * 100)}%
                          </span>
                        </div>
                        <ProgressBar value={pct} className="mt-1.5" />
                      </Link>
                    </li>
                  );
                })}
            </ul>
            {topicCount > 8 && (
              <Link
                href={`${base}/analytics`}
                className="mt-4 block rounded-xl bg-secondary py-2 text-center text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                See all {topicCount} topics
              </Link>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
