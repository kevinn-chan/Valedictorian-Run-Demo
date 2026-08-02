import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Layers, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { topicMastery, rankByWeakness, examTrend, UNGROUPED_SLUG } from "@/lib/analytics";
import { PageHeader, ProgressRing, StatTile } from "@/components/ui-kit";

const STATUS = {
  weak: { label: "Needs work", cls: "bg-red-500/12 text-red-700", bar: "bg-red-500" },
  learning: { label: "Learning", cls: "bg-amber-500/15 text-amber-700", bar: "bg-amber-500" },
  solid: { label: "Solid", cls: "bg-emerald-500/12 text-emerald-700", bar: "bg-emerald-500" },
  unstudied: { label: "Not started", cls: "bg-secondary text-muted-foreground", bar: "bg-muted-foreground/30" },
} as const;

// Exam accuracy over time. Area fill under the line gives the trend weight the
// bare stroke didn't have at this size.
function Sparkline({ pts }: { pts: { pct: number }[] }) {
  const w = 320, h = 80, pad = 8;
  const xs = pts.map((_, i) =>
    pts.length > 1 ? pad + (i * (w - 2 * pad)) / (pts.length - 1) : w / 2
  );
  const ys = pts.map((p) => h - pad - p.pct * (h - 2 * pad));
  const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${h} L${xs[0].toFixed(1)} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full max-w-[320px]" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="var(--primary)" stroke="var(--card)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: cards }, { data: topics }, { data: exams }] =
    await Promise.all([
      supabase.from("sessions").select("id, title").eq("id", id).single(),
      supabase
        .from("cards")
        .select("topic_slug, reps, lapses, ease, due_at")
        .eq("session_id", id),
      supabase
        .from("wiki_pages")
        .select("slug, title")
        .eq("session_id", id)
        .eq("kind", "topic")
        .order("title"),
      supabase
        .from("exam_results")
        .select("score, total, taken_at")
        .eq("session_id", id)
        .order("taken_at"),
    ]);
  if (!session) notFound();

  const rows = rankByWeakness(topicMastery(cards ?? [], topics ?? []));
  const trend = examTrend(exams ?? []);
  const totalCards = cards?.length ?? 0;
  const mastered = rows.reduce((n, r) => n + r.mastered, 0);
  const dueTotal = rows.reduce((n, r) => n + r.dueNow, 0);
  const masteryPct = totalCards ? mastered / totalCards : 0;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Progress"
        description="Where you're strong, where to focus next — from your reviews and mock exams."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Cards" value={totalCards} icon={<Layers className="size-4" />} />
            <StatTile
              label="Mastered"
              value={mastered}
              tone={mastered > 0 ? "positive" : "plain"}
              icon={<Sparkles className="size-4" />}
            />
            <StatTile
              label="Due now"
              value={dueTotal}
              tone={dueTotal > 0 ? "primary" : "plain"}
              href={dueTotal > 0 ? `/sessions/${id}/review` : undefined}
              hint={dueTotal > 0 ? "Review →" : undefined}
              icon={<TrendingUp className="size-4" />}
            />
            <StatTile
              label="Exams"
              value={trend.count}
              icon={<GraduationCap className="size-4" />}
            />
          </div>

          <section className="mt-6">
            <h2 className="text-base font-semibold">Topics — weakest first</h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No flashcards yet.{" "}
                <Link href={`/sessions/${id}`} className="font-medium text-primary hover:underline">
                  Generate cards
                </Link>{" "}
                to see per-topic mastery.
              </p>
            ) : (
              <ul className="mt-4 space-y-1">
                {rows.map((r) => {
                  const s = STATUS[r.status];
                  const href = r.dueNow || r.slug === UNGROUPED_SLUG
                    ? `/sessions/${id}/review`
                    : `/sessions/${id}/wiki/${r.slug}`;
                  return (
                    <li key={r.slug} className="rounded-xl px-4 py-3 transition-colors hover:bg-secondary/40">
                      <div className="flex items-center gap-3">
                        <Link href={href} prefetch={false} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                          {r.title}
                        </Link>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                          {s.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full w-full rounded-full ${s.bar}`}
                            style={{
                              clipPath: `inset(0 ${100 - Math.round(r.masteryPct * 100)}% 0 0 round 999px)`,
                              transition: "clip-path 500ms cubic-bezier(0.23,1,0.32,1)",
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {r.mastered}/{r.cards} mastered
                          {r.lapses > 0 && ` · ${r.lapses} lapse${r.lapses === 1 ? "" : "s"}`}
                          {r.dueNow > 0 && ` · ${r.dueNow} due`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-sm font-semibold">Session mastery</h2>
            <div className="mt-5 flex justify-center">
              <ProgressRing value={masteryPct} size={132} stroke={10}>
                <span className="text-3xl font-semibold tabular-nums tracking-tight">
                  {Math.round(masteryPct * 100)}
                  <span className="text-lg text-muted-foreground">%</span>
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {mastered}/{totalCards}
                </span>
              </ProgressRing>
            </div>
            {dueTotal > 0 && (
              <Link
                href={`/sessions/${id}/review`}
                className="btn-squish mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Review {dueTotal} card{dueTotal === 1 ? "" : "s"}
              </Link>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-sm font-semibold">Mock-exam accuracy</h2>
            {trend.count > 0 && trend.latest ? (
              <>
                <div className="mt-3 flex gap-6">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums tracking-tight">
                      {Math.round(trend.latest.pct * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      latest · {trend.latest.score}/{trend.latest.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-600">
                      {Math.round(trend.best * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">best</div>
                  </div>
                </div>
                {trend.count > 1 && (
                  <div className="mt-3">
                    <Sparkline pts={trend.pts} />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No attempts yet.{" "}
                <Link href={`/sessions/${id}/quiz`} className="font-medium text-primary hover:underline">
                  Take a mock exam
                </Link>{" "}
                to start tracking accuracy.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
