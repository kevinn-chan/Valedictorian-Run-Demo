import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewClient } from "@/app/(app)/sessions/[id]/review/review-client";

// Cross-session "due today": every card due right now, across all of this
// user's sessions, in one queue. RLS scopes cards to the owner, so no explicit
// user filter is needed; grading reuses /api/review (card-id only). No new table.
export const dynamic = "force-dynamic";

export default async function DueTodayPage() {
  const supabase = await createClient();

  const { data: due } = await supabase
    .from("cards")
    .select(
      "id, front, back, topic_slug, source_ref, interval_days, ease, reps, lapses, sessions(title)"
    )
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(100);

  const cards = (due ?? []).map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    topic_slug: c.topic_slug,
    source_ref: c.source_ref as { page?: number } | null,
    interval_days: c.interval_days,
    ease: c.ease,
    reps: c.reps,
    lapses: c.lapses,
    session_title:
      (c.sessions as unknown as { title: string } | null)?.title ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Home
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Due today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every card due across your sessions, in one queue.
      </p>
      <ReviewClient cards={cards} />
    </main>
  );
}
