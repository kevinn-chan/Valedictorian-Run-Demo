import { createClient } from "@/lib/supabase/server";
import { MobileBar, Sidebar } from "@/components/sidebar";
import { GlobalKeys } from "@/components/global-keys";
import { getProfiles } from "@/lib/profiles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signed-out visitors to "/" get the landing page with its own chrome
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return <>{children}</>;

  const email = (data.claims.email as string | undefined)?.toLowerCase();
  const allProfiles = getProfiles();
  const profileName = allProfiles.find((p) => p.email === email)?.name ?? null;
  // Names + indices only — the rail's profile switcher needs to name the other
  // profile and submit its index; emails never cross to the client.
  const profiles = allProfiles.map((p, index) => ({ name: p.name, index }));

  // The rail needs the session list and per-session due dots. RLS scopes both
  // to the owner, so one grouped round-trip covers the whole shell.
  const nowIso = new Date().toISOString();
  const [{ data: sessions }, { data: dueCards }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title")
      .order("created_at", { ascending: false }),
    supabase.from("cards").select("session_id").lte("due_at", nowIso),
  ]);

  const dueBySession = new Map<string, number>();
  for (const c of dueCards ?? [])
    dueBySession.set(c.session_id, (dueBySession.get(c.session_id) ?? 0) + 1);

  const rows = (sessions ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    cards: 0,
    due: dueBySession.get(s.id) ?? 0,
  }));

  return (
    <div className="flex min-h-dvh">
      <GlobalKeys />
      <Sidebar
        sessions={rows}
        dueCount={dueCards?.length ?? 0}
        profileName={profileName}
        profiles={profiles}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar dueCount={dueCards?.length ?? 0} profileName={profileName} profiles={profiles} />
        {/* Bottom padding clears the mobile tab bar; lg drops it. */}
        <div className="flex-1 pb-20 lg:pb-0">{children}</div>
      </div>
    </div>
  );
}
