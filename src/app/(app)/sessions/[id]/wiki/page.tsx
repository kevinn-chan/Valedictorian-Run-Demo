import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WikiIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("slug, kind, title, source_refs")
    .eq("session_id", id)
    .order("title");

  const digests = pages?.filter((p) => p.kind === "file_digest") ?? [];
  const topics = pages?.filter((p) => p.kind === "topic") ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Corpus wiki
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your materials, compiled into study notes — every page cited.
      </p>

      {topics.length > 0 && (
        <section className="mt-8 card-soft overflow-hidden">
          <h2 className="border-b px-5 py-3 text-sm font-medium">Topics</h2>
          <ul>
            {topics.map((t) => {
              const refPages = (t.source_refs as { pages?: number[] } | null)
                ?.pages;
              return (
                <li key={t.slug} className="border-b last:border-b-0">
                  <Link
                    href={`/sessions/${id}/wiki/${t.slug}`}
                    className="group flex items-center gap-3 px-5 py-3 transition hover:bg-secondary/50"
                  >
                    <BookOpen className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">
                      {t.title}
                    </span>
                    {refPages && refPages.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        p. {Math.min(...refPages)}–{Math.max(...refPages)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {digests.length > 0 && (
        <section className="mt-6 card-soft overflow-hidden">
          <h2 className="border-b px-5 py-3 text-sm font-medium">
            File digests
          </h2>
          <ul>
            {digests.map((p) => (
              <li key={p.slug} className="border-b last:border-b-0">
                <Link
                  href={`/sessions/${id}/wiki/${p.slug}`}
                  className="group flex items-center gap-3 px-5 py-3 transition hover:bg-secondary/50"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">
                    {p.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!pages?.length && (
        <p className="mt-8 text-sm text-muted-foreground">
          Nothing compiled yet — upload files in the session and they&apos;ll
          appear here as topics and digests.
        </p>
      )}
    </main>
  );
}
