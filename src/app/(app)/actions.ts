"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSession(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ title, user_id: userId })
    .select("id")
    .single();
  if (error || !session) throw new Error(error?.message ?? "Could not create session");

  redirect(`/sessions/${session.id}`);
}

export async function renameSession(formData: FormData) {
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!id || !title) return;

  const supabase = await createClient();
  // RLS ("own sessions") scopes the update to rows this user owns.
  await supabase.from("sessions").update({ title }).eq("id", id);

  revalidatePath("/");
  revalidatePath(`/sessions/${id}`);
}

// Direct-call action from the quiz client after a completed attempt.
export async function recordExam(
  sessionId: string,
  score: number,
  total: number
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  await supabase
    .from("exam_results")
    .insert({ session_id: sessionId, score, total });
  revalidatePath(`/sessions/${sessionId}/quiz`);
}

export async function deleteSession(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createClient();
  // Remove storage objects under the session prefix first (row delete cascades the rest).
  const { data: objects } = await supabase.storage.from("session-files").list(id);
  if (objects?.length) {
    await supabase.storage
      .from("session-files")
      .remove(objects.map((o) => `${id}/${o.name}`));
  }
  await supabase.from("sessions").delete().eq("id", id);

  revalidatePath("/");
}
