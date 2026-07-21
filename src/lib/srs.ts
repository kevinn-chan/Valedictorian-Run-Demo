// SM-2 lite. ponytail: three grades, no fuzz, no FSRS — upgrade only if
// real retention data ever demands it.

export type Grade = "again" | "good" | "easy";

export interface SrsState {
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
}

export function schedule(
  s: SrsState,
  grade: Grade,
  now: Date = new Date()
): SrsState & { due_at: string } {
  let { interval_days, ease, reps, lapses } = s;

  if (grade === "again") {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    interval_days = 0; // due again this session (10 min)
  } else {
    reps += 1;
    if (grade === "easy") ease += 0.15;
    if (reps === 1) interval_days = 1;
    else if (reps === 2) interval_days = grade === "easy" ? 4 : 3;
    else interval_days = Math.round(interval_days * ease * (grade === "easy" ? 1.3 : 1));
  }

  const due = new Date(now);
  if (interval_days === 0) due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + interval_days);

  return { interval_days, ease, reps, lapses, due_at: due.toISOString() };
}
