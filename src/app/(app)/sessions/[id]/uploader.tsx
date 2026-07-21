"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Supabase Free per-file cap
const MAX_BYTES = 50 * 1024 * 1024;

export function Uploader({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setErrors([]);
    const supabase = createClient();
    const errs: string[] = [];

    // ponytail: sequential uploads — parallelize if multi-file batches ever feel slow
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        errs.push(`${file.name}: over the 50 MB limit`);
        continue;
      }
      setBusy(file.name);
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${sessionId}/${crypto.randomUUID()}-${safeName}`;

      // Browser → Supabase Storage directly; never touches Vercel (4.5 MB body limit)
      const { error: upErr } = await supabase.storage
        .from("session-files")
        .upload(path, file);
      if (upErr) {
        errs.push(`${file.name}: ${upErr.message}`);
        continue;
      }

      const { data: row, error: dbErr } = await supabase
        .from("files")
        .insert({
          session_id: sessionId,
          storage_path: path,
          name: file.name,
          mime: file.type || "application/octet-stream",
          bytes: file.size,
        })
        .select("id")
        .single();
      if (dbErr || !row) {
        errs.push(`${file.name}: ${dbErr?.message ?? "insert failed"}`);
        continue;
      }
      // Kick off compilation; chip moves pending → processing → done on refresh
      fetch(`/api/ingest/${row.id}`, { method: "POST" }).finally(() =>
        router.refresh()
      );
    }

    setBusy(null);
    setErrors(errs);
    router.refresh();
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border border-dashed p-8 text-center text-sm transition-colors ${
          dragging
            ? "border-primary bg-accent"
            : "text-muted-foreground hover:border-primary/40"
        }`}
      >
        <Upload className="mx-auto mb-2 size-5" />
        {busy ? (
          <span>Uploading {busy}…</span>
        ) : (
          <span>
            Drop lecture PDFs, notes, or cheatsheets here — or{" "}
            <span className="font-medium text-primary">browse</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
