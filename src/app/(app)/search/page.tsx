import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Cross-session lexical search. Reuses the same FTS the chat already leans on
// (chunks.tsv GIN index), minus the per-session filter — RLS scopes rows to the
// owner. No vector DB, no new table. Each hit links back to its source PDF page.
export const dynamic = "force-dynamic";

type Hit = {
  session_id: string;
  file_id: string;
  page_from: number;
  page_to: number;
  text: string;
  files: { name: string } | null;
  sessions: { title: string } | null;
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Excerpt centred on the first matched term, with the query terms marked.
function Snippet({ text, terms }: { text: string; terms: string[] }) {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  const start = pos === -1 ? 0 : Math.max(0, pos - 80);
  const slice = text.slice(start, start + 300);
  const set = new Set(terms);
  const parts = terms.length
    ? slice.split(new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi"))
    : [slice];
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      {start > 0 && "…"}
      {parts.map((p, i) =>
        set.has(p.toLowerCase()) ? (
          <mark key={i} className="rounded bg-primary/20 px-0.5 text-foreground">
            {p}
          </mark>
        ) : (
          p
        )
      )}
      {start + 300 < text.length && "…"}
    </p>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [])];

  let hits: Hit[] = [];
  if (query) {
    const { data } = await createClient().then((s) =>
      s
        .from("chunks")
        .select(
          "session_id, file_id, page_from, page_to, text, files(name), sessions(title)"
        )
        .textSearch("tsv", query, { type: "websearch" })
        .limit(50)
    );
    hits = (data ?? []) as unknown as Hit[];
  }

  // Group hits by session so results read as "this course → these pages".
  const bySession = new Map<string, { title: string; hits: Hit[] }>();
  for (const h of hits) {
    const g = bySession.get(h.session_id) ?? {
      title: h.sessions?.title ?? "Session",
      hits: [],
    };
    g.hits.push(h);
    bySession.set(h.session_id, g);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:py-10">
      <h1 className="page-title">Search</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Full-text across every file in every session.
      </p>

      <form action="/search" method="get" className="mt-6">
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Search every session's materials…"
            className="h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </form>

      {query && (
        <p className="mt-4 text-xs text-muted-foreground">
          {hits.length} match{hits.length === 1 ? "" : "es"} for “{query}”
          {hits.length === 50 && " (showing first 50)"}
        </p>
      )}

      {query && hits.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <Search className="size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing found for &ldquo;{query}&rdquo;. Try different or fewer words.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-6">
        {[...bySession.entries()].map(([sid, g]) => (
          <section
            key={sid}
            className="overflow-hidden rounded-2xl border bg-card"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex items-center justify-between bg-secondary/40 px-5 py-3">
              <Link
                href={`/sessions/${sid}`}
                className="text-sm font-medium hover:text-primary"
              >
                {g.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {g.hits.length} hit{g.hits.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul>
              {g.hits.map((h, i) => {
                const pages =
                  h.page_from === h.page_to
                    ? `p.${h.page_from}`
                    : `p.${h.page_from}-${h.page_to}`;
                return (
                  <li key={i} className="border-b px-5 py-3 last:border-b-0">
                    <a
                      href={`/api/file/${h.file_id}#page=${h.page_from}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {h.files?.name ?? "file"} · {pages}
                    </a>
                    <Snippet text={h.text} terms={terms} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
