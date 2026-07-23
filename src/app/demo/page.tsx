import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText, Sparkles } from "lucide-react";
import { DEMO_SESSION_ID, demoReader } from "@/lib/demo";
import { DemoChat } from "./demo-chat";

// Always live — never cache the demo corpus.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live demo — Valedictorian Run",
  description:
    "A read-only sample: browse a course compiled into a wiki and ask it questions, every answer cited to its page.",
};

export default async function DemoPage() {
  if (!DEMO_SESSION_ID) notFound();
  const sb = demoReader();
  const [{ data: session }, { data: pages }] = await Promise.all([
    sb.from("sessions").select("title").eq("id", DEMO_SESSION_ID).single(),
    sb
      .from("wiki_pages")
      .select("slug, kind, title, source_refs")
      .eq("session_id", DEMO_SESSION_ID)
      .order("title"),
  ]);
  if (!session) notFound();

  const topics = (pages ?? []).filter((p) => p.kind === "topic");
  const digests = (pages ?? []).filter((p) => p.kind === "file_digest");
  const starters = topics
    .slice(0, 3)
    .map((t) => `Explain ${t.title} like I missed that lecture`);

  return (
    <div className="min-h-screen bg-[#FFF7F8] text-rose-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          <span className="text-rose-600">●</span> Valedictorian Run
        </Link>
        <Link
          href="/"
          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-400 active:scale-95"
        >
          What is this?
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-24">
        <section className="text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-600">
            <Sparkles className="size-3.5" />
            Live read-only demo — no sign-in
          </p>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            One course, already compiled into a study system
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-rose-900/70">
            This is a real sample — <strong>{session.title}</strong> — that the app turned
            into a topic wiki and a corpus you can question. Browse the notes, then ask it
            anything below. In the full app you drop in your <em>own</em> materials.
          </p>
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Compiled wiki */}
          <section>
            <h2 className="text-sm font-semibold text-rose-950">
              The compiled wiki
            </h2>
            <p className="mt-1 text-xs text-rose-900/60">
              Every topic below was written by the app from the source notes — with page
              citations.
            </p>
            <ul className="mt-4 space-y-2">
              {topics.map((t) => {
                const refPages = (t.source_refs as { pages?: number[] } | null)
                  ?.pages;
                return (
                  <li key={t.slug}>
                    <Link
                      href={`/demo/${t.slug}`}
                      className="group flex items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300"
                    >
                      <BookOpen className="size-4 shrink-0 text-rose-400 transition group-hover:text-rose-600" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-rose-700">
                        {t.title}
                      </span>
                      {refPages && refPages.length > 0 && (
                        <span className="text-xs text-rose-900/50">
                          p. {Math.min(...refPages)}–{Math.max(...refPages)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {digests.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/demo/${d.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300"
                  >
                    <FileText className="size-4 shrink-0 text-rose-400 transition group-hover:text-rose-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-rose-700">
                      {d.title} — full digest
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Live chat */}
          <section>
            <h2 className="text-sm font-semibold text-rose-950">Ask the corpus</h2>
            <p className="mt-1 text-xs text-rose-900/60">
              Grounded, cited answers — or an honest &ldquo;that isn&rsquo;t in the
              materials.&rdquo;
            </p>
            <div className="mt-4">
              <DemoChat starters={starters} />
            </div>
          </section>
        </div>

        <section className="mt-16 rounded-[2.5rem] bg-gradient-to-br from-rose-600 to-rose-500 px-8 py-12 text-center shadow-[0_20px_60px_-20px_rgba(225,29,72,0.55)]">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Want it for your own notes?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-rose-100">
            The whole thing is open source — deploy your own in a few minutes.
          </p>
          <a
            href="https://github.com/kevinn-chan/Valedictorian-Run-Demo"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-rose-600 transition hover:-translate-y-0.5 active:scale-95"
          >
            View the code →
          </a>
        </section>
      </main>
    </div>
  );
}
