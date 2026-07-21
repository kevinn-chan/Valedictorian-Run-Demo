"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { renameSession } from "../../actions";

// Inline rename for a session's title. Click the pencil → the heading turns
// into an input that submits the `renameSession` action (revalidates on the
// server, so the new title is reflected everywhere).
export function RenameTitle({ id, title }: { id: string; title: string }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="group mt-1 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <button
          type="button"
          aria-label="Rename session"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-primary group-hover:opacity-100"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form
      action={renameSession}
      onSubmit={() => setEditing(false)}
      className="mt-1 flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="title"
        defaultValue={title}
        autoFocus
        required
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-10 flex-1 rounded-lg border bg-card px-3 text-2xl font-semibold tracking-tight outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
      />
      <button
        type="submit"
        className="h-10 btn-squish rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Save
      </button>
    </form>
  );
}
