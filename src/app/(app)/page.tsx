import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Layers, Plus, Search, Sparkles } from "lucide-react";
import { DeleteButton } from "./delete-button";
import { createClient } from "@/lib/supabase/server";
import { createSession, deleteSession } from "./actions";
import { Landing } from "./landing";
import { getProfiles } from "@/lib/profiles";
import { CardCover, ProgressBar, ProgressRing, StatTile } from "@/components/ui-kit";

export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return <Landing />;

  const email = (auth.claims.email as string | undefined)?.toLowerCase();
  const profileName = getProfiles().find((p) => p.email === email)?.name;

  const now = new Date().toISOString();
  const [{ data: sessions }, { data: cards }, { count: topicCount }, { data: figures }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, title, created_at, files(count)")
        .order("created_at", { ascending: false }),
      // One read powers every per-session number below — no N+1.
      supabase.from("cards").select("session_id, reps, lapses, due_at"),
      supabase
        .from("wiki_pages")
        .select("*", { count: "exact", head: true })
        .eq("kind", "topic"),
      // Card covers come from the user's own extracted diagrams. One read,
      // first figure per session wins; sessions with none get an initials panel.
      supabase
        .from("figures")
        .select("id, session_id, page")
        .order("page"),
    ]);

  const coverBySession = new Map<
    string,
    { id: string; page: number }
  >();
  for (const f of figures ?? [])
    if (!coverBySession.has(f.session_id))
      coverBySession.set(f.session_id, {
        id: f.id,
        page: f.page,
      });

  const all = cards ?? [];
  const dueCount = all.filter((c) => c.due_at <= now).length;
  const mastered = all.filter((c) => c.reps >= 2).length;
  const started = all.filter((c) => c.reps > 0 || c.lapses > 0).length;
  const masteryPct = all.length ? mastered / all.length : 0;

  const stats = (sid: string) => {
    const cs = all.filter((c) => c.session_id === sid);
    return {
      cards: cs.length,
      due: cs.filter((c) => c.due_at <= now).length,
      pct: cs.length ? cs.filter((c) => c.reps >= 2).length / cs.length : 0,
    };
  };

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">
            Good {partOfDay}
            {profileName ? `, ${profileName}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {dueCount
              ? `${dueCount} card${dueCount === 1 ? "" : "s"} ready for review.`
              : "Nothing due right now — you're all caught up."}
          </p>
        </div>
        <form action="/search" method="get" className="w-full sm:w-72">
          <label className="flex items-center gap-2 rounded-xl border bg-card px-3.5 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/25">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              name="q"
              placeholder="Search all materials…"
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </form>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Due now"
              value={dueCount}
              hint={dueCount ? "Review all →" : "All clear"}
              tone={dueCount ? "primary" : "plain"}
              href={dueCount ? "/review" : undefined}
              icon={<Layers className="size-4" />}
            />
            <StatTile
              label="Mastered"
              value={mastered}
              hint={`of ${all.length} cards`}
              tone={mastered > 0 ? "positive" : "plain"}
              icon={<Sparkles className="size-4" />}
            />
            <StatTile
              label="Sessions"
              value={sessions?.length ?? 0}
              hint={`${topicCount ?? 0} topics`}
              icon={<BookOpen className="size-4" />}
            />
            <StatTile
              label="Started"
              value={started}
              hint="cards seen"
              icon={<FileText className="size-4" />}
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-base font-semibold">Your sessions</h2>
            {sessions && sessions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {sessions.length} total
              </span>
            )}
          </div>

          {sessions?.length ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {sessions.map((s) => {
                const fileCount =
                  (s.files as unknown as { count: number }[])?.[0]?.count ?? 0;
                const st = stats(s.id);
                const cover = coverBySession.get(s.id);
                const created = new Date(s.created_at).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                );
                return (
                  <li
                    key={s.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-[var(--shadow-soft-hover)]"
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    <CardCover
                      figureId={cover?.id}
                      page={cover?.page}
                      title={s.title}
                    />
                    <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/sessions/${s.id}`}
                          className="text-[15px] font-semibold leading-snug tracking-tight after:absolute after:inset-0 hover:text-primary"
                        >
                          {s.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fileCount} file{fileCount === 1 ? "" : "s"} ·{" "}
                          {st.cards} card{st.cards === 1 ? "" : "s"} · added{" "}
                          {created}
                        </p>
                      </div>
                      {st.due > 0 && (
                        <span className="relative z-10 shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
                          {st.due} due
                        </span>
                      )}
                    </div>

                    {st.cards > 0 && (
                      <div className="mb-5 mt-4">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-medium text-muted-foreground">
                            Mastery
                          </span>
                          <span className="font-semibold tabular-nums">
                            {Math.round(st.pct * 100)}%
                          </span>
                        </div>
                        <ProgressBar value={st.pct} className="mt-2" />
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between border-t pt-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        {st.due > 0 ? "Review now" : "Open session"}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <form action={deleteSession} className="relative z-10">
                        <input type="hidden" name="id" value={s.id} />
                        <DeleteButton title={s.title} />
                      </form>
                    </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <section className="mt-4 rounded-2xl border border-dashed px-8 py-16 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent">
                <BookOpen className="size-5 text-primary" />
              </span>
              <h3 className="mt-4 text-base font-medium">
                No study sessions yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                A session holds the full corpus for one course — lecture PDFs,
                notes, cheatsheets. Create one and drop your files in.
              </p>
            </section>
          )}
        </div>

        {/* Right rail: at-a-glance panel. Falls under the list on mobile. */}
        <aside className="space-y-4">
          <div
            className="rounded-2xl border bg-card p-6 text-center"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <h2 className="text-sm font-semibold">Overall mastery</h2>
            <div className="mt-5 flex justify-center">
              <ProgressRing value={masteryPct} size={132} stroke={10}>
                <span className="text-3xl font-semibold tabular-nums tracking-tight">
                  {Math.round(masteryPct * 100)}
                  <span className="text-lg text-muted-foreground">%</span>
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {mastered}/{all.length} cards
                </span>
              </ProgressRing>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              {masteryPct >= 0.8
                ? "You know this material. Keep it warm."
                : masteryPct >= 0.4
                  ? "Solid progress — keep going."
                  : "Early days. A few reviews a day compounds fast."}
            </p>
            {dueCount > 0 && (
              <Link
                href="/review"
                className="btn-squish mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Review {dueCount} card{dueCount === 1 ? "" : "s"}
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>

          <div
            className="rounded-2xl border bg-card p-5"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <h2 className="text-sm font-semibold">New session</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              One per course. Drop the PDFs in after.
            </p>
            <form action={createSession} className="mt-3.5 space-y-2.5">
              <input
                name="title"
                required
                placeholder="e.g. CS2040 Finals"
                className="h-10 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
              />
              <button
                type="submit"
                className="btn-squish flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Create session
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
