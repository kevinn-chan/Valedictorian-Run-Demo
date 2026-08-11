import { createClient as createServiceClient } from "@supabase/supabase-js";

export type BuddyStats = {
  name: string;
  streak: number;
  masteryPct: number;
  mastered: number;
  totalCards: number;
  weakestTopic: { title: string; pct: number } | null;
};

// Read-only aggregate stats for the other profile, via the service role —
// not a privacy boundary (Kevin/Tina already share one password and can
// fully switch into each other's account in one click), just saves the
// click. No RLS view needed: this only ever reads, never takes user input.
export async function getBuddyStats(email: string): Promise<BuddyStats | null> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await service.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return null;

  const { data: sessions } = await service.from("sessions").select("id").eq("user_id", user.id);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) {
    return { name: "", streak: 0, masteryPct: 0, mastered: 0, totalCards: 0, weakestTopic: null };
  }

  const [{ data: cards }, { data: topicPages }] = await Promise.all([
    service.from("cards").select("id, session_id, topic_slug, reps").in("session_id", sessionIds),
    service.from("wiki_pages").select("slug, title, session_id").eq("kind", "topic").in("session_id", sessionIds),
  ]);

  const myCards = cards ?? [];
  const mastered = myCards.filter((c) => c.reps >= 2).length;
  const masteryPct = myCards.length ? mastered / myCards.length : 0;

  const cardIds = myCards.map((c) => c.id);
  const { data: reviews } = cardIds.length
    ? await service.from("reviews").select("reviewed_at").in("card_id", cardIds)
    : { data: [] };
  const reviewDays = new Set(
    (reviews ?? []).map((r) => new Date(r.reviewed_at).toLocaleDateString("en-CA"))
  );
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (reviewDays.has(d.toLocaleDateString("en-CA"))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const weakestTopic = (topicPages ?? [])
    .map((t) => {
      const cs = myCards.filter((c) => c.session_id === t.session_id && c.topic_slug === t.slug);
      return { title: t.title, pct: cs.length ? cs.filter((c) => c.reps >= 2).length / cs.length : 0, cards: cs.length };
    })
    .filter((t) => t.cards > 0)
    .sort((a, b) => a.pct - b.pct)[0];

  return {
    name: "", // filled in by caller from getProfiles()
    streak,
    masteryPct,
    mastered,
    totalCards: myCards.length,
    weakestTopic: weakestTopic ? { title: weakestTopic.title, pct: weakestTopic.pct } : null,
  };
}
