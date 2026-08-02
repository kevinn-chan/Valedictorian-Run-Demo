"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";

interface FileRef {
  id: string;
  name: string;
}

// Belt for the system prompt's no-LaTeX rule.
function stripLatex(text: string) {
  return text
    .replace(/\$\$?([^$\n]+?)\$\$?/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1");
}

// Turns "[filename p.N]" citations into markdown links so they render as
// chips (via the `a` component below) that open the PDF at that page.
// Tolerates multi-page labels ("p.28, 31") by linking the first page.
function linkifyCitations(text: string, files: FileRef[]) {
  const re =
    /\[([^\[\]]{2,80}?)\s+p\.?\s*(\d+)(?:\s*[,–-]\s*\d+)*\]/g;
  return text.replace(re, (match, name: string, page: string) => {
    const file = files.find(
      (f) =>
        f.name.toLowerCase() === name.toLowerCase() ||
        f.name
          .toLowerCase()
          .startsWith(name.toLowerCase().replace(/\.pdf$/, ""))
    );
    if (!file) return match;
    return `[${name} p.${page}](/api/file/${file.id}#page=${page})`;
  });
}

function AssistantMessage({
  text,
  files,
}: {
  text: string;
  files: FileRef[];
}) {
  return (
    <div className="prose prose-sm max-w-none leading-relaxed [&_li]:my-0.5">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mx-0.5 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground no-underline transition hover:bg-secondary"
            >
              {children}
            </a>
          ),
        }}
      >
        {linkifyCitations(stripLatex(text), files)}
      </ReactMarkdown>
    </div>
  );
}

export function ChatClient({
  sessionId,
  files,
  topics,
  initialMessages,
}: {
  sessionId: string;
  files: FileRef[];
  topics: string[];
  initialMessages: UIMessage[];
}) {
  // Starter questions come from THIS session's compiled topics, so they're
  // always answerable from the corpus.
  const starters = topics.length
    ? topics.map((t) => `Explain ${t} like I missed that lecture`)
    : ["Summarize the most exam-critical ideas in these notes"];
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chat/${sessionId}` }),
    messages: initialMessages,
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-4 pb-24">
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-16 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask anything about your materials. Every answer cites the page it
              came from — and if it isn&apos;t in your files, it says so
              instead of guessing.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {starters.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage({ text: q })}
                  className="btn-squish rounded-full border bg-card px-3.5 py-1.5 text-left text-sm shadow-sm hover:border-primary/40 hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "flex justify-end"
                : ""
            }
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                  : "max-w-[90%] rounded-2xl rounded-bl-md bg-card px-4 py-3 text-sm shadow-sm ring-1 ring-border"
              }
            >
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  m.role === "assistant" ? (
                    <AssistantMessage key={i} text={p.text} files={files} />
                  ) : (
                    <span key={i} className="whitespace-pre-wrap">
                      {p.text}
                    </span>
                  )
                ) : null
              )}
            </div>
          </div>
        ))}
        {busy && messages.at(-1)?.role === "user" && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-sm ring-1 ring-border">
            <p className="text-xs text-muted-foreground">
              Reading your materials…
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
        // Sticky sticks to the viewport edge, where the mobile tab bar lives —
        // so clear its height below `lg` or the composer sits underneath it.
        className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-5 border-t bg-background/85 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:bottom-0"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything from your materials…"
            className="h-10 flex-1 rounded-lg border bg-card px-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-10 btn-squish rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
