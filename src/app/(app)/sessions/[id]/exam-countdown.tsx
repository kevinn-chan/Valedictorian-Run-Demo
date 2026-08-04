"use client";

import { useState, useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { setExamDate } from "../../actions";

// ponytail: defer time-dependent values to client to avoid hydration mismatch
function useToday() {
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-CA"));
  }, []);
  return today;
}

export function ExamCountdown({
  sessionId,
  examDate,
}: {
  sessionId: string;
  examDate: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const todayStr = useToday();

  if (editing || !examDate) {
    return (
      <form
        action={async (fd) => {
          await setExamDate(fd);
          setEditing(false);
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="id" value={sessionId} />
        <CalendarClock className="size-4 text-muted-foreground" />
        <input
          type="date"
          name="exam_date"
          defaultValue={examDate ?? ""}
          min={todayStr || undefined}
          className="h-8 rounded-lg border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="submit"
          className="btn-squish rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Set
        </button>
        {examDate && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </form>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + "T00:00:00");
  const diff = Math.ceil((exam.getTime() - today.getTime()) / 86_400_000);

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-colors hover:border-primary/30"
      suppressHydrationWarning
    >
      <CalendarClock className={`size-4 ${diff <= 7 ? "text-red-500" : "text-primary"}`} />
      <span className="font-semibold tabular-nums" suppressHydrationWarning>
        {diff <= 0 ? "Today!" : `${diff}d`}
      </span>
      <span className="text-muted-foreground" suppressHydrationWarning>
        {diff <= 0 ? "Exam day" : "until exam"}
      </span>
    </button>
  );
}
