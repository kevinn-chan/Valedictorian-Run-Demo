import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestFile } from "@/lib/ingest";

// Vercel Hobby ceiling; a big deck's compile call can take minutes.
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestFile(supabase, fileId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await supabase
      .from("files")
      .update({ ingest_status: "error" })
      .eq("id", fileId);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}
