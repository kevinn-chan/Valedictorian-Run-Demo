import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarRange,
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
    text: "Recall every definition and formula, with the page it lives on",
  },
  {
    Icon: CalendarRange,
    text: "Follow a day-by-day plan built from your actual syllabus, not a template",
  },
  {
    Icon: Layers,
    text: "Remember it next month, not just tonight. Spaced repetition does the nagging",
  },
  {
    Icon: Presentation,
    text: "Find your gaps by teaching back, graded against your own materials",
  },
  {
    Icon: GraduationCap,
    text: "Walk into the exam having already sat three of them",
  },
];

const STEPS = [
  {
    title: "Drop your PDFs",
    body: "Lecture decks, scribbled notes, cheatsheets. Drag them in and that's the last filing you'll ever do.",
  },
  {
    title: "We compile them",
    body: "Every page becomes a wiki of topics, formulas and exam traps. Nothing is dropped, and every claim is stamped to its page.",
  },
  {
    title: "You master them",
    body: "Cue cards, mock exams, teach-back grading and a chat that answers with receipts. Study, don't re-read.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <p className="text-sm font-semibold tracking-tight">
          <span className="text-primary">●</span> Valedictorian Run
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link
            href="/login"
            className="btn-squish rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-16 text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Private by design, built for exactly two students
          </p>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Your lecture PDFs,{" "}
            <span className="relative whitespace-nowrap text-primary">
              reborn
              <svg
                aria-hidden
                viewBox="0 0 120 8"
                className="absolute -bottom-1 left-0 w-full text-primary/45"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 6 C 30 2, 60 7, 118 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            as a study system
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Drop in a semester of slides. Get a browsable wiki, cue cards, mock
            exams, a study plan, and answers that always show the page they
            came from.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="btn-squish inline-block rounded-2xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              Start studying →
            </Link>
            <Link
              href="/demo"
              className="btn-squish inline-block rounded-2xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-primary hover:border-primary/50"
            >
              Try the live demo
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <h2 className="text-3xl font-semibold">
            Three steps, zero busywork
          </h2>
          <ol className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} className="border-t border-border pt-4">
                <span
                  aria-hidden
                  className="font-serif text-sm tabular-nums text-primary"
                >
                  {i + 1}
                </span>
                <h3 className="mt-2 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Interactive demo */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <h2 className="text-3xl font-semibold">
            Don&apos;t take our word for it. Poke it.
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            These are real artifacts from a real Computer Networks deck,
            compiled by the app.
          </p>
          {/* Two things you can poke, then one worked answer. The third item
              used to be a third identical card that did nothing when clicked --
              a decoy sitting between two interactive ones. It is an example,
              so it stops pretending to be a control. */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <FlipCard />
            <MiniQuiz />
          </div>
          <figure className="mt-5 rounded-2xl border border-border bg-muted/40 px-6 py-5">
            <figcaption className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageCircleQuestion className="size-3.5" />
              you ask
            </figcaption>
            <p className="mt-1 max-w-2xl text-sm text-foreground">
              Why does Go-back-N discard out-of-order frames?
            </p>
            <p className="mt-3 max-w-3xl border-t border-border pt-3 text-sm leading-relaxed text-foreground/80">
              The receiver only accepts frames in sequence, so anything after
              a loss is resent from the error onward{" "}
              <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
                slides p.14
              </span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              every answer carries its receipt
            </p>
          </figure>
        </section>

        {/* Technical thesis */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10" style={{ boxShadow: "var(--shadow-soft)" }}>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-primary">
              The thesis
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-foreground">
              RAG is dead. Compile instead.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Most study tools retrieve chunks at query time, hoping the right
              fragment lands in context. We compile the entire corpus at ingest,
              so every page becomes structured knowledge and every claim is
              stamped to its source. Zero retrieval latency. Zero relevance tuning. Zero drift.
            </p>
            <ul className="mt-7 flex flex-wrap items-baseline gap-x-10 gap-y-2.5 border-t border-border pt-5">
              <li className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular-nums text-foreground">0</span>
                <span className="text-sm text-muted-foreground">vector databases</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular-nums text-foreground">100%</span>
                <span className="text-sm text-muted-foreground">of the corpus in context</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular-nums text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">monthly running cost</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Learning objectives */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-20">
          <div className="rounded-3xl border border-border bg-card p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-3xl font-semibold">
              By exam day, you will
            </h2>
            <ul className="mt-6 space-y-4">
              {OBJECTIVES.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                    <BadgeCheck className="size-4 text-green-700 dark:text-green-400" />
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
          <div
            className="rounded-3xl border border-primary/25 bg-card px-8 py-14 text-center"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <h2 className="text-3xl font-semibold text-foreground">
              Ready to run for valedictorian?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Two seats, zero subscriptions, zero vector databases. Your
              materials stay yours. They just learn to fight back.
            </p>
            <Link
              href="/login"
              className="btn-squish mt-7 inline-block rounded-2xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              Pick your profile →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Valedictorian Run. A corpus-first study system for two.
      </footer>
    </div>
  );
}
