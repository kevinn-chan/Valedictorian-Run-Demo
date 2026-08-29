"use client";

import { ArrowLeftRight } from "lucide-react";

// Instant profile switch: POST to /api/switch-profile which generates a
// magic-link token server-side (admin API, no email sent) and redirects
// through /auth/confirm. One click, no re-login.
export function ProfileSwitcher({
  profiles,
  currentName,
  className,
}: {
  profiles: { name: string; index: number }[];
  currentName: string | null;
  className: string;
}) {
  const others = profiles.filter((p) => p.name !== currentName);
  if (others.length === 0) return null;

  return (
    <form action="/api/switch-profile" method="post">
      {others.map((p) => (
        <button
          key={p.index}
          type="submit"
          name="profile"
          value={p.index}
          className={className}
        >
          <ArrowLeftRight className="size-[18px]" />
          <span className="min-w-0 flex-1 truncate">Switch to {p.name}</span>
        </button>
      ))}
    </form>
  );
}
