import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
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

const CHIP: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  done: "bg-green-500/15 text-green-700 dark:text-green-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
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
  ] = await Promise.all([
    supabase.from("sessions").select("id, title").eq("id", id).single(),
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
  ]);
  if (!session) notFound();

  // Total card count is just the rows we already fetched — no extra query.
  const cardCount = topicCards?.length ?? 0;

  const compiled = files?.some((f) => f.ingest_status === "done");
  const compiling = files?.some(
    (f) => f.ingest_status === "pending" || f.ingest_status === "processing"
  );

  const tabs = [
    { href: "wiki", label: "Corpus wiki", Icon: BookOpen },
    { href: "plan", label: "Learning plan", Icon: CalendarRange },
    ...((cardCount ?? 0) > 0
      ? [
          {
            href: "review",
            label: dueCount ? `Review · ${dueCount} due` : "Review",
            Icon: Layers,
          },
        ]
      : []),
    { href: "chat", label: "Ask", Icon: MessageCircleQuestion },
    { href: "teach", label: "Teach back", Icon: Presentation },
    { href: "quiz", label: "Mock exam", Icon: GraduationCap },
    ...((cardCount ?? 0) > 0
      ? [{ href: "analytics", label: "Progress", Icon: TrendingUp }]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {compiling && <StatusPoller />}
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All sessions
      </Link>
      <RenameTitle id={session.id} title={session.title} />

      {compiled && (
        <nav className="mt-5 flex flex-wrap gap-1.5">
          {tabs.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={`/sessions/${session.id}/${href}`}
              className="group inline-flex items-center gap-1.5 btn-squish rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium shadow-sm hover:border-primary/40 hover:text-primary"
            >
              <Icon className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
              {label}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-8 card-soft overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-medium">Materials</h2>
          {compiled && (
            <CardsButton
              sessionId={session.id}
              hasCards={(cardCount ?? 0) > 0}
            />
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
                className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              >
                {f.ingest_status === "done" ? (
                  <Link
                    href={`/sessions/${session.id}/wiki/${f.id.slice(0, 8)}-digest`}
                    title="Open this file's digest"
                    className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                  >
                    {f.name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {f.name}
                  </span>
                )}
                {f.pages && (
                  <span className="text-xs text-muted-foreground">
                    {f.pages} pages
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
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

      {topicPages && topicCards && topicCards.length > 0 && (
        <section className="mt-6 card-soft p-5">
          <h2 className="text-sm font-medium">Mastery by topic</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From your review history — open a topic to revisit its notes.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topicPages.map((t) => {
              const cs = topicCards.filter((c) => c.topic_slug === t.slug);
              if (!cs.length) return null;
              const reviewed = cs.some((c) => c.reps > 0 || c.lapses > 0);
              const score = cs.filter((c) => c.reps >= 2).length / cs.length;
              const cls = !reviewed
                ? "bg-secondary text-muted-foreground"
                : score < 0.4
                  ? "bg-red-500/15 text-red-700 dark:text-red-300"
                  : score < 0.8
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-green-500/15 text-green-700 dark:text-green-300";
              return (
                <Link
                  key={t.slug}
                  href={`/sessions/${session.id}/wiki/${t.slug}`}
                  title={
                    reviewed
                      ? `${Math.round(score * 100)}% mastered`
                      : "Not reviewed yet"
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80 ${cls}`}
                >
                  {t.title}
                  {reviewed && ` · ${Math.round(score * 100)}%`}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
