import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/profiles";

// Zero-friction profile sign-in: clicking a profile mints a one-time token
// server-side (no email sent, no rate limits) and exchanges it for a session.
// Security model = knowing the URL, by explicit owner decision (2-user app,
// non-confidential notes). Re-lock later by restoring a password form.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase();

  if (!getProfiles().some((p) => p.email === email)) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data) {
    return NextResponse.redirect(
      new URL("/login?error=profile", request.url),
      303
    );
  }

  const supabase = await createClient();
  let { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyErr) {
    // some GoTrue versions register generateLink tokens under "email"
    const retry = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (retry.data?.properties?.hashed_token) {
      ({ error: verifyErr } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: retry.data.properties.hashed_token,
      }));
    }
  }
  if (verifyErr) {
    return NextResponse.redirect(
      new URL("/login?error=profile", request.url),
      303
    );
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
