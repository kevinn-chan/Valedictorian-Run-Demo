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
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/sessions/${id}/wiki`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Corpus wiki
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{page.title}</h1>
      {pages && pages.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          pages {Math.min(...pages)}–{Math.max(...pages)}
        </p>
      )}

      <div className="mt-8">
        <MarkdownView markdown={page.markdown} />
      </div>

      {figures && figures.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Figures from the source
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {figures.map((f) => (
              <figure
                key={f.id}
                className="overflow-hidden rounded-xl border bg-card"
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
                    className="max-h-96 w-full bg-white object-contain"
                  />
                </a>
                <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                  {f.caption ? `${f.caption} · ` : ""}p.{f.page}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <WikiNav sessionId={id} prev={prev} next={next} />
    </main>
  );
}
