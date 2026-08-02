import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ProgressBar } from "@/components/ui-kit";

export default async function WikiIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: pages }, { data: cards }] =
    await Promise.all([
      supabase.from("sessions").select("id, title").eq("id", id).single(),
      supabase
        .from("wiki_pages")
        .select("slug, kind, title, source_refs")
        .eq("session_id", id)
        .order("title"),
      supabase.from("cards").select("topic_slug, reps").eq("session_id", id),
    ]);
  if (!session) notFound();

  const digests = pages?.filter((p) => p.kind === "file_digest") ?? [];
  const topics = pages?.filter((p) => p.kind === "topic") ?? [];
  const all = cards ?? [];


  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Corpus wiki"
        description="Your materials, compiled into study notes — every page cited."
      />

      {topics.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Topics</h2>
            <span className="text-sm text-muted-foreground">
              {topics.length}
            </span>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => {
              const refPages = (t.source_refs as { pages?: number[] } | null)
                ?.pages;
              const cs = all.filter((c) => c.topic_slug === t.slug);
              const pct = cs.length
                ? cs.filter((c) => c.reps >= 2).length / cs.length
                : null;
              return (
                <li key={t.slug}>
                  <Link
                    href={`/sessions/${id}/wiki/${t.slug}`}
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
                          {refPages && refPages.length > 0 && (
                            <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                              p. {Math.min(...refPages)}
                              {Math.min(...refPages) !== Math.max(...refPages) &&
                                `–${Math.max(...refPages)}`}
                            </span>
                          )}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="mt-auto pt-4">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-muted-foreground">
                              {cs.length} card{cs.length === 1 ? "" : "s"}
                            </span>
                            <span className="font-medium tabular-nums">
                              {Math.round(pct * 100)}%
                            </span>
                          </div>
                          <ProgressBar value={pct} className="mt-1.5" />
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {digests.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">File digests</h2>
            <span className="text-sm text-muted-foreground">
              {digests.length}
            </span>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {digests.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/sessions/${id}/wiki/${p.slug}`}
                  prefetch={false}
                  className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <FileText className="size-4" />
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                    {p.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!pages?.length && (
        <div className="rounded-2xl border border-dashed px-8 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent">
            <BookOpen className="size-5 text-primary" />
          </span>
          <h3 className="mt-4 text-base font-medium">Nothing compiled yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Upload files in the session and they&apos;ll appear here as topics
            and digests.
          </p>
          <Link
            href={`/sessions/${id}`}
            className="btn-squish mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add materials
          </Link>
        </div>
      )}
    </main>
  );
}
