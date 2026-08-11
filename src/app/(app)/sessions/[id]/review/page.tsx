import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ReviewClient } from "./review-client";
import { sortByWeakness } from "@/lib/analytics";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: due }, { data: allCards }, { data: topics }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, title")
        .eq("id", id)
        .single(),
      supabase
        .from("cards")
        .select("id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses")
        .eq("session_id", id)
        .lte("due_at", new Date().toISOString())
        .order("due_at")
        .limit(50),
      supabase
        .from("cards")
        .select("topic_slug, reps, lapses, ease, due_at")
        .eq("session_id", id),
      supabase
        .from("wiki_pages")
        .select("slug, title")
        .eq("session_id", id)
        .eq("kind", "topic"),
    ]);
  if (!session) notFound();

  const cards = sortByWeakness(
    (due ?? []).map((c) => ({ ...c, session_id: id })),
    (allCards ?? []).map((c) => ({ ...c, session_id: id })),
    (topics ?? []).map((t) => ({ ...t, session_id: id }))
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Review"
        description="Grade yourself honestly — the schedule does the rest."
      />
      <ReviewClient sessionId={id} cards={cards} />
    </main>
  );
}
