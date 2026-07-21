import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 forces the follow-up to be a GET — the default 307 re-POSTs to the
  // target, which has no POST handler and renders a blank page.
  return NextResponse.redirect(new URL("/", request.url), 303);
}
