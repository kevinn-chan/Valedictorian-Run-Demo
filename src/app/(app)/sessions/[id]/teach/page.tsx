import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeachClient } from "./teach-client";

export default async function TeachPage({
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

  const { data: topics } = await supabase
    .from("wiki_pages")
    .select("slug, title")
    .eq("session_id", id)
    .eq("kind", "topic")
    .order("title");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Teach back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The fastest way to find gaps: explain a topic from memory and get
        graded against your own materials, page-cited.
      </p>
      {topics?.length ? (
        <TeachClient sessionId={id} topics={topics} />
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Compile at least one file first — topics appear here once the corpus
          is built.
        </p>
      )}
    </main>
  );
}
