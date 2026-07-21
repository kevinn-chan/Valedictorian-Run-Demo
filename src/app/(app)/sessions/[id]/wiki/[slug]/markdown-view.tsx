"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

// ponytail: "concise" = first section of the compiled markdown, zero extra LLM
// calls; upgrade to a generated short-form variant if truncation reads badly.
export function MarkdownView({ markdown }: { markdown: string }) {
  const [full, setFull] = useState(true);
  const firstSection = markdown.split(/\n(?=## )/)[0];
  const hasMore = firstSection.length < markdown.length;

  return (
    <div>
      {hasMore && (
        <div className="flex gap-1 text-xs">
          {(["Concise", "Full"] as const).map((label) => {
            const active = full === (label === "Full");
            return (
              <button
                key={label}
                onClick={() => setFull(label === "Full")}
                className={`rounded-full px-3 py-1 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      <article className="prose mt-4 max-w-none text-sm leading-relaxed dark:prose-invert [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_li]:my-1">
        <ReactMarkdown>{full ? markdown : firstSection}</ReactMarkdown>
      </article>
    </div>
  );
}
