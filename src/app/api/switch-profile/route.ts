import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getProfiles } from "@/lib/profiles";

// Instant profile switch: the caller is already authenticated, so we use the
// admin API to generate a magic-link token for the target profile and redirect
// through /auth/confirm — no email sent, no second login step.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const idx = Number(form.get("profile") ?? -1);
  const target = getProfiles()[idx];
  if (!target) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
    options: { redirectTo: `${request.nextUrl.origin}/` },
  });

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  // Sign out the current session first, then redirect through the confirm route
  // which will verify the token and establish the new session.
  await supabase.auth.signOut({ scope: "local" });

  const confirm = new URL("/auth/confirm", request.url);
  confirm.searchParams.set("token_hash", data.properties.hashed_token);
  confirm.searchParams.set("type", "magiclink");
  confirm.searchParams.set("next", "/");
  return NextResponse.redirect(confirm, 303);
}
