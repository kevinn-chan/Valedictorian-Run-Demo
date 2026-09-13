"use client";

import { Trash2 } from "lucide-react";

// Deleting a session takes its files, wiki, cards, and chats with it —
// one accidental click shouldn't do that silently.
export function DeleteButton({ title }: { title: string }) {
  return (
    <button
      type="submit"
      aria-label={`Delete ${title}`}
      onClick={(e) => {
        if (
          !confirm(
            `Delete "${title}"? Its files, wiki, cards, and chats go with it.`
          )
        )
          e.preventDefault();
      }}
      className="cursor-pointer rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
