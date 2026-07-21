"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

function stripLatex(text: string) {
  return text
    .replace(/\$\$?([^$\n]+?)\$\$?/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1");
}

// Render "[file p.N]" citations as small chips (plain — the source PDFs are
// private, so demo citations don't link out).
function AssistantMessage({ text }: { text: string }) {
  const chipped = stripLatex(text).replace(
    /\[([^\[\]]{2,80}?)\s+p\.?\s*(\d+)(?:\s*[,–-]\s*\d+)*\]/g,
    (_m, name: string, page: string) => `\`${name} p.${page}\``
  );
  return (
    <div className="prose prose-sm max-w-none leading-relaxed text-rose-950 [&_code]:rounded-full [&_code]:bg-rose-100 [&_code]:px-2 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-medium [&_code]:text-rose-700 [&_code]:before:content-none [&_code]:after:content-none [&_li]:my-0.5">
      <ReactMarkdown>{chipped}</ReactMarkdown>
    </div>
  );
}

export function DemoChat({ starters }: { starters: string[] }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/demo/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-[0_10px_36px_-12px_rgba(190,18,60,0.25)]">
      <p className="text-sm font-semibold text-rose-950">
        Ask this sample course anything
      </p>
      <p className="mt-1 text-xs text-rose-900/60">
        Answers come only from the compiled notes — every claim carries its page.
      </p>

      <div className="mt-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {starters.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage({ text: q })}
                className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-left text-xs text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-400 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-950"
                : "text-sm"
            }
          >
            {m.parts.map((p, i) =>
              p.type === "text" ? (
                m.role === "assistant" ? (
                  <AssistantMessage key={i} text={p.text} />
                ) : (
                  <span key={i} className="whitespace-pre-wrap">
                    {p.text}
                  </span>
                )
              ) : null
            )}
          </div>
        ))}
        {busy && messages.at(-1)?.role === "user" && (
          <p className="text-xs text-rose-400">Reading the notes…</p>
        )}
        {error && (
          <p className="text-xs text-rose-500">
            The demo is popular right now — give it a moment and try again.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. what is a vector in R?"
          className="h-10 flex-1 rounded-xl border border-rose-200 bg-white px-3.5 text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-rose-700 active:scale-95 disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
