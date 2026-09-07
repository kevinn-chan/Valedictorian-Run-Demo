import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/profiles";
import { isRateLimited } from "@/lib/rate-limit";

// The login form posts a profile INDEX, never an address: emails passed to a
// client component are serialized into the RSC payload of a PUBLIC page, so
// anyone could read both users' real addresses off /login. Same shape as
// /api/switch-profile — the client names a profile, the server knows the email.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`send-link:${ip}`)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as { profile?: number } | null;
  const target = getProfiles()[Number(body?.profile ?? -1)];
  // Don't echo back whether an index existed beyond this generic message.
  if (!target) {
    return NextResponse.json({ error: "Unknown profile." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: target.email,
    options: { emailRedirectTo: `${request.nextUrl.origin}/auth/confirm` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, name: target.name });
}
