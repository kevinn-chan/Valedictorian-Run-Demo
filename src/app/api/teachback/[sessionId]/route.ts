import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeTeachback } from "@/lib/teachback";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { topicSlug, explanation } = await request.json();
  if (!topicSlug || !explanation?.trim() || explanation.trim().length < 40) {
    return NextResponse.json(
      { error: "pick a topic and write at least a few sentences" },
      { status: 400 }
    );
  }

  try {
    const grade = await gradeTeachback(
      supabase,
      sessionId,
      topicSlug,
      explanation.trim()
    );
    return NextResponse.json(grade);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "grading failed" },
      { status: 500 }
    );
  }
}
