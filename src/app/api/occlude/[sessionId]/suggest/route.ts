import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestOcclusionRegions } from "@/lib/occlusion-suggest";

// Vision-suggest occlusion regions for a figure. Ownership is checked with the
// user's RLS client; the figure image is then read with the service role (same
// storage-owner sidestep as /api/figure) and handed to the vision model.
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

  const { figureId } = (await request.json()) as { figureId?: string };
  if (!figureId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: fig } = await supabase
    .from("figures")
    .select("id, session_id")
    .eq("id", figureId)
    .single();
  if (!fig || fig.session_id !== sessionId) {
    return NextResponse.json({ error: "figure not found" }, { status: 404 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const regions = await suggestOcclusionRegions(service, figureId);
    return NextResponse.json({ regions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "suggest failed" },
      { status: 500 }
    );
  }
}
