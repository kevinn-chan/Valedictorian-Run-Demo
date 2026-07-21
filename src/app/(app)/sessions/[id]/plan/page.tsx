import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "./plan-form";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, goal_text, exam_date")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: plan } = await supabase
    .from("learning_plans")
    .select("markdown, inputs, generated_at")
    .eq("session_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href={`/sessions/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {session.title}
      </Link>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        Learning plan
      </h1>

      <div className="mt-6">
        <PlanForm
          sessionId={id}
          initialGoal={session.goal_text ?? ""}
          initialExamDate={session.exam_date ?? ""}
          hasPlan={!!plan}
        />
      </div>

      {plan ? (
        <article className="prose mt-10 max-w-none text-sm leading-relaxed dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_li]:my-1">
          <ReactMarkdown>{plan.markdown}</ReactMarkdown>
        </article>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">
          No plan yet. Set your exam date above and generate one — it schedules
          only the topics that actually exist in your corpus wiki.
        </p>
      )}
    </main>
  );
}
