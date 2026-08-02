import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
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
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Teach back"
        description="The fastest way to find gaps: explain a topic from memory and get graded against your own materials, page-cited."
      />
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
