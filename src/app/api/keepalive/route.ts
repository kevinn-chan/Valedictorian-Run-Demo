import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Daily Vercel cron pings this so Supabase Free's 7-day inactivity pause never fires.
export async function GET(request: NextRequest) {
  // When CRON_SECRET is set, Vercel cron sends it as a Bearer token — require it then.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await admin.from("sessions").select("id").limit(1);

  return NextResponse.json({
    ok: !error,
    at: new Date().toISOString(),
    ...(error ? { error: error.message } : {}),
  });
}
