import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarkdownView } from "./markdown-view";
import { WikiNav } from "./wiki-nav";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  const supabase = await createClient();

  // Page content, the ordered sibling list, and this topic's figures fan out
  // together (one round-trip). `figures` is null if the table isn't migrated yet.
  const [{ data: page }, { data: siblings }, { data: figures }] =
    await Promise.all([
      supabase
        .from("wiki_pages")
        .select("title, kind, markdown, source_refs")
        .eq("session_id", id)
        .eq("slug", slug)
        .single(),
      supabase
        .from("wiki_pages")
        .select("slug, title, kind")
        .eq("session_id", id)
        .order("title"),
      supabase
        .from("figures")
        .select("id, page, caption, kind")
        .eq("session_id", id)
        .eq("topic_slug", slug)
        .order("page"),
    ]);
  if (!page) notFound();

  const pages = (page.source_refs as { pages?: number[] } | null)?.pages;

  // Navigate within the same kind (topic ↔ topic, digest ↔ digest).
  const ordered = (siblings ?? []).filter((p) => p.kind === page.kind);
  const idx = ordered.findIndex((p) => p.slug === slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <main className="min-w-0">
          <Link
            href={`/sessions/${id}/wiki`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden>←</span> Corpus wiki
          </Link>
          <h1 className="mt-2 page-title">{page.title}</h1>
          {pages && pages.length > 0 && (
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
              {Math.min(...pages) === Math.max(...pages)
                ? `Source page ${Math.min(...pages)}`
                : `Source pages ${Math.min(...pages)}–${Math.max(...pages)}`}
            </p>
          )}

          {/* Prose caps its own measure so the article stays readable even
              though the shell around it is wide. */}
          <div className="mt-9 max-w-[68ch]">
            <MarkdownView markdown={page.markdown} />
          </div>

          {figures && figures.length > 0 && (
            <section className="mt-14">
              <h2 className="text-base font-semibold">
                Figures{" "}
                <span className="font-normal text-muted-foreground">
                  · {figures.length}
                </span>
              </h2>
              <div className="mt-4 space-y-6">
                {figures.map((f) => (
                  <figure
                    key={f.id}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    <a
                      href={`/api/figure/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/figure/${f.id}`}
                        alt={f.caption ?? `Figure on page ${f.page}`}
                        loading="lazy"
                        className="max-h-[32rem] w-full bg-white object-contain"
                      />
                    </a>
                    <figcaption className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                      {f.caption ? `${f.caption} · ` : ""}p.{f.page}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <WikiNav sessionId={id} prev={prev} next={next} />
        </main>

        {/* Sibling index: jump between topics without returning to the list. */}
        {ordered.length > 1 && (
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {page.kind === "topic" ? "Topics" : "Digests"}
              </p>
              <ul className="mt-3 max-h-[calc(100dvh-8rem)] space-y-0.5 overflow-y-auto pr-1">
                {ordered.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/sessions/${id}/wiki/${s.slug}`}
                      prefetch={false}
                      aria-current={s.slug === slug ? "page" : undefined}
                      className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug transition-colors ${
                        s.slug === slug
                          ? "bg-secondary font-medium text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
