"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// `recompile` = the file already compiled; re-running it pulls it through the
// latest ingest prompt (the ingest route deletes this file's old chunks/wiki
// first, so it's replace-in-place). Confirm since it discards current notes.
export function CompileButton({
  fileId,
  recompile = false,
}: {
  fileId: string;
  recompile?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (
      recompile &&
      !confirm("Recompile this file? Its wiki digest and topics get regenerated from the latest prompt.")
    )
      return;
    setBusy(true);
    router.refresh(); // show "processing" chip
    await fetch(`/api/ingest/${fileId}`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  const label = recompile
    ? busy
      ? "Recompiling…"
      : "Recompile"
    : busy
      ? "Compiling…"
      : "Compile";

  return (
    <button
      onClick={run}
      disabled={busy}
      className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  );
}
