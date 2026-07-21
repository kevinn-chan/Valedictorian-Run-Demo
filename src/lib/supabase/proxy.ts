import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getProfiles } from "@/lib/profiles";

const PUBLIC_PATHS = ["/login", "/auth", "/api/keepalive", "/api/profile-login"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the JWT signature (recommended over getSession for protection)
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims?.email as string | undefined)?.toLowerCase();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (isPublic) return supabaseResponse;

  if (!email) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Allowlist belt (the DB trigger is the braces). PROFILES emails are always
  // allowed — one env var to keep in sync instead of two.
  const allowed = new Set([
    ...getProfiles().map((p) => p.email),
    ...(process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ]);
  if (!allowed.has(email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not-allowed");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
