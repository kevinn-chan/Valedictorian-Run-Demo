import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
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
    <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Mock exam"
      />
      <QuizClient sessionId={id} history={history ?? []} />
    </main>
  );
}
