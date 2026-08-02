import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { schedule, type Grade } from "@/lib/srs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Undo: restore a card's previous SRS state
  if (body.action === "undo") {
    const { cardId, prev } = body as {
      action: "undo";
      cardId: string;
      prev: { interval_days: number; ease: number; reps: number; lapses: number; due_at: string };
    };
    if (!cardId || !prev) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    await supabase.from("cards").update(prev).eq("id", cardId);
    await supabase
      .from("reviews")
      .delete()
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(1);
    return NextResponse.json({ ok: true });
  }

  const { cardId, grade } = body as { cardId: string; grade: Grade };
  if (!cardId || !["again", "good", "easy"].includes(grade)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: card, error } = await supabase
    .from("cards")
    .select("id, interval_days, ease, reps, lapses, due_at")
    .eq("id", cardId)
    .single();
  if (error || !card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  const next = schedule(card, grade);
  await supabase.from("cards").update(next).eq("id", card.id);
  await supabase.from("reviews").insert({ card_id: card.id, grade });

  return NextResponse.json({
    ok: true,
    due_at: next.due_at,
    prev: {
      interval_days: card.interval_days,
      ease: card.ease,
      reps: card.reps,
      lapses: card.lapses,
      due_at: card.due_at,
    },
  });
}
