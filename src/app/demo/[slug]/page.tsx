import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SESSION_ID, demoReader } from "@/lib/demo";
import { MarkdownView } from "@/app/(app)/sessions/[id]/wiki/[slug]/markdown-view";

export const dynamic = "force-dynamic";

export default async function DemoWikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!DEMO_SESSION_ID) notFound();
  const sb = demoReader();
  const { data: page } = await sb
    .from("wiki_pages")
    .select("title, markdown, source_refs")
    .eq("session_id", DEMO_SESSION_ID)
    .eq("slug", slug)
    .single();
  if (!page) notFound();

  const pages = (page.source_refs as { pages?: number[] } | null)?.pages;

  return (
    <div className="min-h-screen bg-[#FFF7F8] text-rose-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          <span className="text-rose-600">●</span> Valedictorian Run
        </Link>
        <Link
          href="/demo"
          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-400 active:scale-95"
        >
          ← Back to demo
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-24">
        <Link
          href="/demo"
          className="text-sm text-rose-900/50 transition hover:text-rose-700"
        >
          ← Sample course
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {page.title}
        </h1>
        {pages && pages.length > 0 && (
          <p className="mt-1 text-xs text-rose-900/50">
            pages {Math.min(...pages)}–{Math.max(...pages)}
          </p>
        )}
        <div className="mt-8">
          <MarkdownView markdown={page.markdown} />
        </div>
      </main>
    </div>
  );
}
