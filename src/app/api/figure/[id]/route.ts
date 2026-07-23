import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_SESSION_ID } from "@/lib/demo";

// Serves a captured figure image. Inline wiki figures and the demo point here.
// Access: the user's RLS client scopes lookups to their own sessions; anonymous
// visitors can only ever reach the one public demo session's figures. The signed
// URL is minted with the service role so storage-object ownership never matters.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("figures")
    .select("storage_path")
    .eq("id", id)
    .single();

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let storagePath = mine?.storage_path as string | undefined;

  // Demo fallback: only figures belonging to the public demo session are served
  // without an owning session — never any other user's.
  if (!storagePath) {
    const { data: demo } = await service
      .from("figures")
      .select("storage_path, session_id")
      .eq("id", id)
      .single();
    if (demo?.session_id === DEMO_SESSION_ID) {
      storagePath = demo.storage_path as string;
    }
  }

  if (!storagePath) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: signed, error } = await service.storage
    .from("session-files")
    .createSignedUrl(storagePath, 3600);
  if (error || !signed) {
    return NextResponse.json({ error: "could not sign" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
