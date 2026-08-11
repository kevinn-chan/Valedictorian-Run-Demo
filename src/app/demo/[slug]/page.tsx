import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SESSION_ID, demoReader } from "@/lib/demo";
import { MarkdownView } from "@/app/(app)/sessions/[id]/wiki/[slug]/markdown-view";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function DemoWikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!DEMO_SESSION_ID) notFound();
  const sb = demoReader();
  const [{ data: page }, { data: figures }] = await Promise.all([
    sb
      .from("wiki_pages")
      .select("title, markdown, source_refs")
      .eq("session_id", DEMO_SESSION_ID)
      .eq("slug", slug)
      .single(),
    sb
      .from("figures")
      .select("id, page, caption")
      .eq("session_id", DEMO_SESSION_ID)
      .eq("topic_slug", slug)
      .order("page"),
  ]);
  if (!page) notFound();

  const pages = (page.source_refs as { pages?: number[] } | null)?.pages;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          <span className="text-primary">●</span> Valedictorian Run
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link
            href="/demo"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-primary transition hover:-translate-y-0.5 hover:border-primary/50 active:scale-95"
          >
            ← Back to demo
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-24">
        <Link
          href="/demo"
          className="text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Sample course
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {page.title}
        </h1>
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
                  className="overflow-hidden rounded-xl border border-border bg-card"
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
                      className="max-h-96 w-full bg-card object-contain"
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
      </main>
    </div>
  );
}
