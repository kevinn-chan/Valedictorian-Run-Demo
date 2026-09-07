import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ReviewClient } from "@/app/(app)/sessions/[id]/review/review-client";
import { sortByWeakness } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DueTodayPage() {
  const supabase = await createClient();

  const [{ data: due }, { data: allCards }, { data: topics }] =
    await Promise.all([
      supabase
        .from("cards")
        .select(
          "id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses, session_id, sessions(title)"
        )
        .lte("due_at", new Date().toISOString())
        .order("due_at")
        .limit(100),
      supabase
        .from("cards")
        .select("topic_slug, reps, lapses, ease, due_at, session_id"),
      supabase
        .from("wiki_pages")
        .select("slug, title, session_id")
        .eq("kind", "topic"),
    ]);

  // The queue is capped (see .limit above); the dashboard counts every due
  // card, so the two screens disagreed once a deck got big.
  const now = Date.now();
  const dueTotal = (allCards ?? []).filter(
    (c) => new Date(c.due_at).getTime() <= now
  ).length;

  const cards = sortByWeakness(
    (due ?? []).map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      topic_slug: c.topic_slug,
      source_ref: c.source_ref as { page?: number } | null,
      interval_days: c.interval_days,
      ease: c.ease,
      reps: c.reps,
      lapses: c.lapses,
      session_id: c.session_id,
      session_title:
        (c.sessions as unknown as { title: string } | null)?.title ?? null,
    })),
    allCards ?? [],
    topics ?? []
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back="/"
        backLabel="Dashboard"
        title="Due today"
        description={
          dueTotal > cards.length
            ? `Every card due across your sessions, in one queue — ${cards.length} at a time.`
            : "Every card due across your sessions, in one queue."
        }
      />
      <ReviewClient cards={cards} dueTotal={dueTotal} />
    </main>
  );
}
