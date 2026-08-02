import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { OccludeClient } from "./occlude-client";

export default async function OccludePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: figures } = await supabase
    .from("figures")
    .select("id, caption, page")
    .eq("session_id", id)
    .order("page");

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Image occlusion"
        description="Cover a label on a figure and recall it from memory. Each box you draw becomes a spaced-repetition card in this session's review queue."
      />

      {figures?.length ? (
        <OccludeClient sessionId={id} figures={figures} />
      ) : (
        <p className="mt-10 rounded-xl border border-dashed px-8 py-16 text-center text-sm text-muted-foreground">
          This session has no figures yet. Compile a file that contains diagrams
          or labelled illustrations first.
        </p>
      )}
    </main>
  );
}
