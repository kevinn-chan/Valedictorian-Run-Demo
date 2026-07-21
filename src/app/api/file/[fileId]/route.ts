import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens a session file (citation chips link here with #page=N).
// RLS check via the user's client; the signed URL itself is minted with the
// service role so storage-object ownership quirks never matter.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: signed, error } = await service.storage
    .from("session-files")
    .createSignedUrl(file.storage_path, 3600);
  if (error || !signed) {
    return NextResponse.json({ error: "could not sign" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
