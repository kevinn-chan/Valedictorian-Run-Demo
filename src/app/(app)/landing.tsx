import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarRange,
  FileUp,
  GraduationCap,
  Layers,
  MessageCircleQuestion,
  Presentation,
  Sparkles,
} from "lucide-react";
import { FlipCard, MiniQuiz } from "./landing-demos";
import { ThemeToggle } from "@/components/theme-toggle";

const OBJECTIVES = [
  {
    Icon: BookOpenCheck,
    text: "Recall every definition and formula — with the page it lives on",
  },
  {
    Icon: CalendarRange,
    text: "Follow a day-by-day plan built from your actual syllabus, not a template",
  },
  {
    Icon: Layers,
    text: "Remember it next month, not just tonight — spaced repetition does the nagging",
  },
  {
    Icon: Presentation,
    text: "Find your gaps by teaching back — graded against your own materials",
  },
  {
    Icon: GraduationCap,
    text: "Walk into the exam having already sat three of them",
  },
];

const STEPS = [
  {
    Icon: FileUp,
    title: "Drop your PDFs",
    body: "Lecture decks, scribbled notes, cheatsheets — drag them in and that's the last filing you'll ever do.",
  },
  {
    Icon: Sparkles,
    title: "We compile them",
    body: "Every page becomes a wiki of topics, formulas and exam traps — every word kept, every claim page-stamped.",
  },
  {
    Icon: GraduationCap,
    title: "You master them",
    body: "Cue cards, mock exams, teach-back grading and a chat that answers with receipts. Study, don't re-read.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`@keyframes vr-drift { 0%,100% { transform: translate(0,0) } 50% { transform: translate(14px,-18px) } }`}</style>

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <p className="text-sm font-semibold tracking-tight">
          <span className="text-primary">●</span> Valedictorian Run
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 active:scale-95"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto w-full max-w-5xl overflow-hidden px-6 pb-20 pt-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-10 size-48 rounded-[3rem] bg-primary/15 blur-2xl [animation:vr-drift_9s_ease-in-out_infinite]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 bottom-0 size-56 rounded-[4rem] bg-amber-200/40 blur-2xl [animation:vr-drift_11s_ease-in-out_infinite_reverse]"
          />
          <p className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Private by design — built for exactly two students
          </p>
          <h1 className="relative mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your lecture PDFs,{" "}
            <span className="relative whitespace-nowrap text-primary">
              reborn
              <svg
                aria-hidden
                viewBox="0 0 120 8"
                className="absolute -bottom-1 left-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 6 C 30 2, 60 7, 118 3"
                  fill="none"
                  stroke="#a5b4fc"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            as a study system
          </h1>
          <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Drop in a semester of slides. Get a browsable wiki, cue cards, mock
            exams, a study plan — and answers that always show the page they
            came from.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-block rounded-2xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 active:scale-95"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              Start studying →
            </Link>
            <Link
              href="/demo"
              className="inline-block rounded-2xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-primary transition hover:-translate-y-0.5 hover:border-primary/50 active:scale-95"
            >
              Try the live demo
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Three steps, zero busywork
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary">
                  <Icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive demo */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Don&apos;t take our word for it — poke it
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
            These are real artifacts from a real Computer Networks deck,
            compiled by the app.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <FlipCard />
            <MiniQuiz />
            <div className="flex h-56 flex-col rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageCircleQuestion className="size-3.5" />
                you ask
              </p>
              <p className="mt-1 text-sm text-foreground">
                Why does Go-back-N discard out-of-order frames?
              </p>
              <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-foreground/80">
                The receiver only accepts frames in sequence, so anything after
                a loss is resent from the error onward{" "}
                <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
                  slides p.14
                </span>
              </p>
              <p className="mt-auto text-xs text-muted-foreground">
                every answer carries its receipt
              </p>
            </div>
          </div>
        </section>

        {/* Technical thesis */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10" style={{ boxShadow: "var(--shadow-soft)" }}>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-primary">
              The thesis
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              RAG is dead — compile instead
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Most study tools retrieve chunks at query time, hoping the right
              fragment lands in context. We compile the entire corpus at ingest —
              every page becomes structured knowledge, every claim stamped to its
              source. Zero retrieval latency. Zero relevance tuning. Zero drift.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-secondary/50 p-5">
                <p className="text-2xl font-semibold tabular-nums text-foreground">0</p>
                <p className="mt-1 text-sm text-muted-foreground">vector databases</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-5">
                <p className="text-2xl font-semibold tabular-nums text-foreground">100%</p>
                <p className="mt-1 text-sm text-muted-foreground">of the corpus in context</p>
              </div>
              <div className="rounded-2xl bg-secondary/50 p-5">
                <p className="text-2xl font-semibold tabular-nums text-foreground">$0</p>
                <p className="mt-1 text-sm text-muted-foreground">monthly running cost</p>
              </div>
            </div>
          </div>
        </section>

        {/* Learning objectives */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-20">
          <div className="rounded-3xl border border-border bg-card p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-2xl font-semibold tracking-tight">
              By exam day, you will
            </h2>
            <ul className="mt-6 space-y-4">
              {OBJECTIVES.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <BadgeCheck className="size-4 text-green-700" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">
                    {text}
                  </span>
                  <Icon className="ml-auto mt-1 size-4 shrink-0 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/90 px-8 py-14 text-center shadow-[0_20px_60px_-20px_rgba(79,70,229,0.55)] dark:shadow-[0_20px_60px_-20px_rgba(129,140,248,0.3)]">
            <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground">
              Ready to run for valedictorian?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
              Two seats, zero subscriptions, zero vector databases. Your
              materials stay yours — they just learn to fight back.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-block rounded-2xl bg-card px-7 py-3.5 text-base font-semibold text-primary transition hover:-translate-y-0.5 active:scale-95"
            >
              Pick your profile →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Valedictorian Run — a corpus-first study system for two.
      </footer>
    </div>
  );
}
