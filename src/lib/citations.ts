export interface FileRef {
  id: string;
  name: string;
}

// Turns "[filename p.N]" citations into markdown links so they render as
// chips that open that file's page. Tolerates multi-page labels ("p.28, 31")
// by linking the first page. Unmatched names stay as plain text.
export function linkifyCitations(text: string, files: FileRef[]) {
  const re = /\[([^\[\]]{2,80}?)\s+p\.?\s*(\d+)(?:\s*[,–-]\s*\d+)*\]/g;
  return text.replace(re, (match, name: string, page: string) => {
    const file = files.find(
      (f) =>
        f.name.toLowerCase() === name.toLowerCase() ||
        f.name.toLowerCase().startsWith(name.toLowerCase().replace(/\.pdf$/, ""))
    );
    if (!file) return match;
    return `[${name} p.${page}](/api/file/${file.id}#page=${page})`;
  });
}

// The href linkifyCitations writes, parsed back into what PageViewer needs.
export function parseCiteHref(href: string | undefined) {
  const m = href?.match(/^\/api\/file\/([^/#]+)#page=(\d+)$/);
  return m ? { fileId: m[1], page: Number(m[2]) } : null;
}
