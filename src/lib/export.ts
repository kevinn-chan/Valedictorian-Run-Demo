// Shared bits for the session export routes (wiki Markdown / Anki TSV).

// Session titles are free text ("Introduction to R — week 3"), so they need
// flattening before they can ride in a Content-Disposition filename.
export function fileSlug(title: string | null | undefined) {
  const slug = (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "session";
}
