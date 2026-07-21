import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizClient } from "./quiz-client";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Both fan out together — history query no-ops gracefully (empty) until the
  // 0002 migration is applied.
  const [{ data: session }, { data: history }] = await Promise.all([
    supabase.from("sessions").select("id, title").eq("id", id).single(),
    supabase
      .from("exam_results")
      .select("score, total, taken_at")
      .eq("session_id", id)
      .order("taken_at", { ascending: false })
      .limit(5),
  ]);
  if (!session) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Mock exam</h1>
      <QuizClient sessionId={id} history={history ?? []} />
    </main>
  );
}
