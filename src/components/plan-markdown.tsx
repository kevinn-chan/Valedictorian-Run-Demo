import ReactMarkdown from "react-markdown";
import { plainMath } from "@/lib/plain-math";

// Plans are stored as raw model markdown, which carried `$SST = SSR + SSE$`
// and GFM task boxes (`[ ]`) that plain react-markdown prints literally.
// ponytail: ☐ glyph instead of remark-gfm — the checklist is read, not ticked.
export function PlanMarkdown({ markdown }: { markdown: string }) {
  const text = plainMath(markdown)
    .replace(/\[ \]/g, "☐")
    .replace(/\[[xX]\]/g, "☑");
  return <ReactMarkdown>{text}</ReactMarkdown>;
}
