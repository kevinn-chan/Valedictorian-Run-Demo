import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMnemonic } from "@/lib/mnemonic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cardId } = await request.json();
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  try {
    const mnemonic = await generateMnemonic(supabase, cardId);
    return NextResponse.json({ mnemonic });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "generation failed" },
      { status: 500 }
    );
  }
}
