import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui-kit";
import { ChatClient } from "./chat-client";

export default async function ChatPage({
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

  const [{ data: files }, { data: topics }, { data: chat }] =
    await Promise.all([
      supabase.from("files").select("id, name").eq("session_id", id),
      supabase
        .from("wiki_pages")
        .select("title")
        .eq("session_id", id)
        .eq("kind", "topic")
        .limit(3),
      supabase
        .from("chats")
        .select("id")
        .eq("session_id", id)
        .limit(1)
        .maybeSingle(),
    ]);

  let initialMessages: UIMessage[] = [];
  if (chat) {
    const { data: history } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("chat_id", chat.id)
      .order("created_at")
      .limit(100);
    initialMessages = (history ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
    }));
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
      <PageHeader
        back={`/sessions/${id}`}
        backLabel={session.title}
        title="Ask the corpus"
        description="Answers come only from your materials, with the page to prove it."
      />
      <ChatClient
        sessionId={id}
        files={files ?? []}
        topics={(topics ?? []).map((t) => t.title)}
        initialMessages={initialMessages}
      />
    </main>
  );
}
