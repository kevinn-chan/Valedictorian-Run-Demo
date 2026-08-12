import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { StudyPlanForm } from "./study-plan-form";

export default async function StudyPlanPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;

  const [{ data: sessions }, { data: plan }] = await Promise.all([
    supabase.from("sessions").select("id").eq("user_id", userId ?? ""),
    // null if the study_plans table isn't migrated yet — same defensive
    // pattern used elsewhere in this app.
    supabase
      .from("study_plans")
      .select("markdown, inputs, generated_at")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back="/"
        backLabel="Dashboard"
        title="Weekly plan"
        description="One schedule across every course you're taking, interleaved by exam date and mastery gaps."
      />

      {!sessions?.length ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet — add a course and compile it first.
        </p>
      ) : (
        <>
          <StudyPlanForm initialFocus={(plan?.inputs as { focus?: string } | null)?.focus ?? ""} hasPlan={!!plan} />

          {plan ? (
            <article
              className="prose mt-8 max-w-none rounded-2xl border bg-card p-6 text-sm leading-relaxed sm:p-8 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_li]:my-1"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <ReactMarkdown>{plan.markdown}</ReactMarkdown>
            </article>
          ) : (
            <p className="mt-10 text-sm text-muted-foreground">
              No plan yet. Generate one — it schedules only topics that actually
              exist in your courses&apos; corpus wikis.
            </p>
          )}
        </>
      )}
    </main>
  );
}
