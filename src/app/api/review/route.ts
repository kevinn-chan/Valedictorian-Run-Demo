import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { schedule, type Grade } from "@/lib/srs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId, grade } = (await request.json()) as {
    cardId: string;
    grade: Grade;
  };
  if (!cardId || !["again", "good", "easy"].includes(grade)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: card, error } = await supabase
    .from("cards")
    .select("id, interval_days, ease, reps, lapses")
    .eq("id", cardId)
    .single();
  if (error || !card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  const next = schedule(card, grade);
  await supabase.from("cards").update(next).eq("id", card.id);
  await supabase.from("reviews").insert({ card_id: card.id, grade });

  return NextResponse.json({ ok: true, due_at: next.due_at });
}
