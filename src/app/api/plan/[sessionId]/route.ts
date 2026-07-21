import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePlan } from "@/lib/plan";

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

  const { goal, examDate } = await request.json();
  if (!examDate) {
    return NextResponse.json({ error: "exam date required" }, { status: 400 });
  }

  try {
    await generatePlan(supabase, sessionId, goal ?? "", examDate);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "plan generation failed" },
      { status: 500 }
    );
  }
}
