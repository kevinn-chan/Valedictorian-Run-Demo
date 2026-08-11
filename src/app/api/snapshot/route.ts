import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = data.claims.sub as string;

  const { count: total } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true });

  const { count: mastered } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .gte("reps", 2);

  const { error } = await supabase.from("mastery_snapshots").upsert(
    {
      user_id: userId,
      snapshot_date: new Date().toLocaleDateString("en-CA"),
      total_cards: total ?? 0,
      mastered_cards: mastered ?? 0,
    },
    { onConflict: "user_id,snapshot_date" }
  );
  if (error) {
    console.error("mastery_snapshots upsert failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
