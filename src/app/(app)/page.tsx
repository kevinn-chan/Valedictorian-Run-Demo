import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DeleteButton } from "./delete-button";
import { createClient } from "@/lib/supabase/server";
import { createSession, deleteSession } from "./actions";
import { Landing } from "./landing";
import { getProfiles } from "@/lib/profiles";

export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return <Landing />;

  const email = (auth.claims.email as string | undefined)?.toLowerCase();
  const profileName = getProfiles().find((p) => p.email === email)?.name;

  const now = new Date().toISOString();
  const [{ data: sessions }, { count: dueCount }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, title, created_at, files(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .lte("due_at", now),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {profileName ? `Welcome back, ${profileName}` : "Study sessions"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        One session per course — drop in materials, get a study system.
      </p>

      {dueCount ? (
        <Link
          href="/review"
          className="mt-6 flex items-center justify-between rounded-xl border border-primary/30 bg-accent/50 px-5 py-4 transition hover:border-primary/50 hover:bg-accent"
        >
          <span className="text-sm font-medium">
            {dueCount} card{dueCount === 1 ? "" : "s"} due today
          </span>
          <span className="text-sm font-medium text-primary">Review all →</span>
        </Link>
      ) : null}

      <form action={createSession} className="mt-8 flex gap-2">
        <input
          name="title"
          required
          placeholder="New session — e.g. CS2040 Finals"
          className="h-10 flex-1 rounded-lg border bg-card px-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          className="h-10 btn-squish rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Create
        </button>
      </form>

      {sessions?.length ? (
        <ul className="mt-8 card-soft overflow-hidden">
          {sessions.map((s) => {
            const fileCount =
              (s.files as unknown as { count: number }[])?.[0]?.count ?? 0;
            const created = new Date(s.created_at).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            );
            return (
              <li
                key={s.id}
                className="group flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sessions/${s.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fileCount} file{fileCount === 1 ? "" : "s"} · created{" "}
                    {created}
                  </p>
                </div>
                <form action={deleteSession}>
                  <input type="hidden" name="id" value={s.id} />
                  <DeleteButton title={s.title} />
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="mt-10 rounded-xl border border-dashed px-8 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent">
            <BookOpen className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-base font-medium">No study sessions yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            A session holds the full corpus for one course — lecture PDFs,
            notes, cheatsheets. Create one above and drop your files in.
          </p>
        </section>
      )}
    </main>
  );
}
