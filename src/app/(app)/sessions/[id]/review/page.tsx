import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ReviewClient } from "./review-client";

export default async function ReviewPage({
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

  const { data: due } = await supabase
    .from("cards")
    .select("id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses")
    .eq("session_id", id)
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Review"
        description="Grade yourself honestly — the schedule does the rest."
      />
      <ReviewClient sessionId={id} cards={due ?? []} />
    </main>
  );
}
