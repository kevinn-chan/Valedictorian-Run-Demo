import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/profiles";
import { isRateLimitedDurable } from "@/lib/rate-limit";

// The login form posts a profile INDEX, never an address: emails passed to a
// client component are serialized into the RSC payload of a PUBLIC page, so
// anyone could read both users' real addresses off /login. Same shape as
// /api/switch-profile — the client names a profile, the server knows the email.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimitedDurable(`send-link:ip:${ip}`, 5, 60)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as { profile?: number } | null;
  const index = Number(body?.profile ?? -1);
  const target = getProfiles()[index];
  // Don't echo back whether an index existed beyond this generic message.
  if (!target) {
    return NextResponse.json({ error: "Unknown profile." }, { status: 400 });
  }

  // The cap that actually matters. A per-IP limit cannot bound how much mail
  // reaches one mailbox, because addresses rotate and the mailbox does not.
  // This also protects the project's auth-email quota: exhausting that is the
  // worse attack, since it locks the real users out rather than just annoying
  // them. Keyed on the profile index so the address never leaves the server.
  if (await isRateLimitedDurable(`send-link:profile:${index}`, 3, 3600)) {
    return NextResponse.json(
      { error: "That profile has been sent several links recently — check your inbox, or try again later." },
      { status: 429 }
    );
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
