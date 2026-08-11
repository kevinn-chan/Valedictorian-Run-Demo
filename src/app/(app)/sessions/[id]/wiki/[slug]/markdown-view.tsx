"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { PageViewer } from "./page-viewer";

// ponytail: LLM prompt says "use Unicode, not LaTeX" but some slip through.
// String replace at render beats adding remark-math + rehype-katex.
const LATEX_REPLACEMENTS: [RegExp, string][] = [
  [/\\rightarrow/g, "→"],
  [/\\leftarrow/g, "←"],
  [/\\leftrightarrow/g, "↔"],
  [/\\Rightarrow/g, "⇒"],
  [/\\Leftarrow/g, "⇐"],
  [/\\to(?![a-zA-Z])/g, "→"],
  [/\\times/g, "×"],
  [/\\pm/g, "±"],
  [/\\neq/g, "≠"],
  [/\\leq/g, "≤"],
  [/\\geq/g, "≥"],
  [/\\le(?![a-zA-Z])/g, "≤"],
  [/\\ge(?![a-zA-Z])/g, "≥"],
  [/\\infty/g, "∞"],
  [/\\approx/g, "≈"],
  [/\\text\{([^}]*)\}/g, "$1"],
];

function cleanLatex(text: string): string {
  for (const [re, ch] of LATEX_REPLACEMENTS) text = text.replace(re, ch);
  return text;
}

// Turns inline "(p. N)" citations (the ingest prompt's required format) into
// markdown links with a "#cite-N" fragment, so the `a` override below can
// open the actual PDF page inline instead of navigating. A real URL scheme
// (e.g. "cite:4") gets stripped by react-markdown's default urlTransform,
// which only allows http/https/mailto/tel/relative — a fragment survives it.
// Ranges ("p. 4-6") link their first page — good enough for "show me the source".
function linkifyCitations(text: string): string {
  return text.replace(
    /\(p\.\s*(\d+)(?:\s*[-–]\s*\d+)?\)/g,
    (match, page: string) => `[${match}](#cite-${page})`
  );
}

// ponytail: "concise" = first section of the compiled markdown, zero extra LLM
// calls; upgrade to a generated short-form variant if truncation reads badly.
export function MarkdownView({
  markdown: raw,
  fileId,
}: {
  markdown: string;
  fileId?: string;
}) {
  const markdown = linkifyCitations(cleanLatex(raw));
  const [full, setFull] = useState(true);
  const [openPage, setOpenPage] = useState<number | null>(null);
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
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const page = fileId && href?.startsWith("#cite-") ? Number(href.slice(6)) : null;
              if (page) {
                return (
                  <button
                    type="button"
                    onClick={() => setOpenPage(page)}
                    className="mx-0.5 rounded px-0.5 text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
                  >
                    {children}
                  </button>
                );
              }
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {full ? markdown : firstSection}
        </ReactMarkdown>
      </article>
      {openPage && fileId && (
        <PageViewer fileId={fileId} page={openPage} onClose={() => setOpenPage(null)} />
      )}
    </div>
  );
}
