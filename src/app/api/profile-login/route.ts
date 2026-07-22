import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/profiles";

// Shared-password sign-in: a profile click submits the profile's email + the
// shared password, which we verify with real Supabase auth (signInWithPassword).
// Knowing the URL is no longer enough — without the password there is no session.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!getProfiles().some((p) => p.email === email)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
