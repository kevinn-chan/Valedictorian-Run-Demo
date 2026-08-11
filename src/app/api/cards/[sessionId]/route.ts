import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCards, generateTopicCards } from "@/lib/cards";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const topicSlug = body?.topicSlug as string | undefined;
  const mode = body?.mode as "more" | "harder" | undefined;

  try {
    const count = topicSlug
      ? await generateTopicCards(supabase, sessionId, topicSlug, mode ?? "more")
      : await generateCards(supabase, sessionId);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "card generation failed" },
      { status: 500 }
    );
  }
}
