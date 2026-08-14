"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { CompileButton } from "./compile-button";
import { deleteFile } from "../../actions";

const CHIP: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  processing: "bg-blue-500/15 text-blue-700",
  done: "bg-emerald-500/15 text-emerald-700",
  error: "bg-red-500/15 text-red-700",
};

function formatBytes(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024).toFixed(0)} KB`;
}

type FileRow = {
  id: string;
  name: string;
  bytes: number | null;
  pages: number | null;
  ingest_status: string;
};

export function FileList({ files, base }: { files: FileRow[]; base: string }) {
  const [optimisticFiles, removeOptimistic] = useOptimistic(
    files,
    (state, id: string) => state.filter((f) => f.id !== id)
  );
  const [, startTransition] = useTransition();

  function handleDelete(f: FileRow) {
    if (!confirm(`Delete "${f.name}"? Its wiki topics, cards, and citations go with it.`)) return;
    startTransition(async () => {
      removeOptimistic(f.id);
      await deleteFile(f.id);
    });
  }

  if (optimisticFiles.length === 0) return null;

  return (
    <ul className="border-t">
      {optimisticFiles.map((f) => (
        <li
          key={f.id}
          className="group flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5 py-3 transition-colors last:border-b-0 hover:bg-secondary/30"
        >
          {f.ingest_status === "done" ? (
            <Link
              href={`${base}/wiki/${f.id.slice(0, 8)}-digest`}
              prefetch={false}
              title="Open this file's digest"
              className="min-w-0 flex-1 basis-full truncate text-sm font-medium hover:text-primary sm:basis-auto"
            >
              {f.name}
            </Link>
          ) : (
            <span className="min-w-0 flex-1 basis-full truncate text-sm font-medium sm:basis-auto">
              {f.name}
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            {f.pages ? `${f.pages} pages` : ""}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatBytes(f.bytes)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              CHIP[f.ingest_status] ?? CHIP.pending
            }`}
          >
            {f.ingest_status}
          </span>
          {(f.ingest_status === "pending" ||
            f.ingest_status === "error" ||
            f.ingest_status === "processing") && <CompileButton fileId={f.id} />}
          {f.ingest_status === "done" && <CompileButton fileId={f.id} recompile />}
          <button
            type="button"
            aria-label={`Delete ${f.name}`}
            onClick={() => handleDelete(f)}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
