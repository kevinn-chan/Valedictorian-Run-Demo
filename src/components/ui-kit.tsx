import Link from "next/link";
import { Flame } from "lucide-react";

/* Shared vocabulary for every authenticated screen. One card shape, one tile,
   one header, one ring — so the app reads as a single surface rather than a
   dozen pages that happen to share a palette. */

/** Circular progress. Used for mastery — the one number worth a whole shape. */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct * 100)}% mastered`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.23,1,0.32,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Horizontal progress bar. The list-row counterpart to the ring. */
export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  // Clipped rather than width-animated: clip-path composites on the GPU and
  // keeps the rounded end cap that a scaleX would squash.
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className="h-full w-full rounded-full bg-primary"
        style={{
          clipPath: `inset(0 ${(1 - pct) * 100}% 0 0 round 999px)`,
          transition: "clip-path 600ms cubic-bezier(0.23,1,0.32,1)",
        }}
      />
    </div>
  );
}

const TONE = {
  plain: "bg-card border-border",
  primary: "bg-primary/8 border-primary/20",
  positive: "bg-emerald-500/8 border-emerald-600/20",
} as const;

/** One number, one label. The whole dashboard stat vocabulary. */
export function StatTile({
  label,
  value,
  hint,
  tone = "plain",
  href,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONE;
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = `rounded-2xl border p-5 ${TONE[tone]}`;
  return href ? (
    <Link href={href} className={`${cls} block card-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Every inner page opens the same way: crumb, title, one line of orientation. */
export function PageHeader({
  back,
  backLabel,
  title,
  description,
  actions,
}: {
  back?: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-[68ch] text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Cover image for a session or topic card, drawn from a figure the ingest
 * pipeline already extracted from the user's own PDFs — the corpus is the
 * star, so no stock art. Falls back to a tinted panel carrying the title's
 * initials so a card with no figures keeps the same shape as one that has them.
 *
 * These are whole lecture-slide page images, not cropped photos: they are
 * text-heavy and busy at thumbnail size. So the cover is treated as texture,
 * not subject — anchored top (slide titles live there), softened, and capped
 * with a scrim so the card's own title stays the loudest thing on the card.
 * Captions are full sentences from the vision model and are never shown here;
 * only the page number, which is short and actually useful.
 */
export function CardCover({
  figureId,
  page,
  title,
  className = "h-28",
}: {
  figureId?: string | null;
  page?: number | null;
  title: string;
  className?: string;
}) {
  if (!figureId) {
    const initials = title
      .split(/\s+/)
      .filter((w) => /[a-z0-9]/i.test(w))
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    return (
      <div
        aria-hidden
        className={`${className} flex items-center justify-center border-b bg-secondary/60`}
      >
        <span className="text-xl font-semibold tracking-tight text-primary/45">
          {initials || "·"}
        </span>
      </div>
    );
  }
  return (
    <div className={`${className} relative overflow-hidden border-b bg-white`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/figure/${figureId}`}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-full object-cover object-top opacity-90 saturate-[0.85] transition-transform duration-300 group-hover:scale-[1.02]"
      />
      {/* Fade into the card body so a hard slice through slide text doesn't
          read as a broken screenshot. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent"
      />
      {page != null && (
        <span className="absolute right-2 top-2 rounded-md bg-card/85 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground ring-1 ring-border backdrop-blur-sm">
          p.{page}
        </span>
      )}
    </div>
  );
}

/** A titled region. Replaces the ad-hoc `card-soft` wrappers page to page. */
export function Panel({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-card ${className}`}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClassName || "p-5"}>{children}</div>
    </section>
  );
}

/** Micro area chart for trends. Used for exam accuracy and mastery trends. */
export function Sparkline({
  pts,
  className = "",
}: {
  pts: { pct: number }[];
  className?: string;
}) {
  if (pts.length < 2) return null;
  const w = 320,
    h = 80,
    pad = 8;
  const xs = pts.map((_, i) =>
    pts.length > 1 ? pad + (i * (w - 2 * pad)) / (pts.length - 1) : w / 2
  );
  const ys = pts.map((p) => h - pad - p.pct * (h - 2 * pad));
  const line = xs
    .map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)} ${h} L${xs[0].toFixed(1)} ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-20 w-full max-w-[320px] ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r="3"
          fill="var(--primary)"
          stroke="var(--card)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/** GitHub-style review activity heatmap — 12 weeks of daily review counts. */
export function ReviewHeatmap({
  reviews,
  streak,
  todayCount,
  dailyGoal,
}: {
  reviews: { reviewed_at: string }[];
  streak: number;
  todayCount: number;
  dailyGoal: number;
}) {
  // Count reviews per day (YYYY-MM-DD in local tz)
  const countByDay = new Map<string, number>();
  for (const r of reviews) {
    const day = new Date(r.reviewed_at).toLocaleDateString("en-CA");
    countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
  }

  // Build 84-day grid: 12 full Mon-Sun weeks, the most recent of which
  // contains today. Cells after today (future days in the current week)
  // are simply not emitted, rather than rendered as phantom future dates.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = (today.getDay() + 6) % 7; // 0=Mon
  const startOffset = todayDay + 7 * 11; // Monday, 11 full weeks before this week's Monday
  const start = new Date(today);
  start.setDate(start.getDate() - startOffset);

  const cells: { date: string; count: number }[] = [];
  const d = new Date(start);
  for (let i = 0; i < 84; i++) {
    if (d <= today) {
      const key = d.toLocaleDateString("en-CA");
      cells.push({ date: key, count: countByDay.get(key) ?? 0 });
    }
    d.setDate(d.getDate() + 1);
  }

  const level = (n: number) =>
    n === 0 ? 0 : n < 5 ? 1 : n < 10 ? 2 : 3;

  return (
    <div
      className="rounded-2xl border bg-card p-5"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame
            className={`size-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span className="text-sm font-semibold">
            {streak} day{streak === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {todayCount}/{dailyGoal} today
        </span>
      </div>
      <div
        className="mt-4 grid gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "repeat(7, 1fr)",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date}: ${c.count} review${c.count === 1 ? "" : "s"}`}
            className="aspect-square rounded-[3px]"
            style={{
              backgroundColor: [
                "var(--secondary)",
                "color-mix(in oklch, var(--primary) 30%, transparent)",
                "color-mix(in oklch, var(--primary) 60%, transparent)",
                "var(--primary)",
              ][level(c.count)],
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3].map((l) => (
          <div
            key={l}
            className="size-2.5 rounded-[2px]"
            style={{
              backgroundColor: [
                "var(--secondary)",
                "color-mix(in oklch, var(--primary) 30%, transparent)",
                "color-mix(in oklch, var(--primary) 60%, transparent)",
                "var(--primary)",
              ][l],
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
