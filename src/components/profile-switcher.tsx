"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

import { SHARED_PASSWORD_KEY } from "@/lib/shared-password";

// One-click profile switch: re-submits the *existing* /api/profile-login route
// with the other profile's index and the shared password this tab cached at
// sign-in. No new auth path — identical form data to the manual two-step flow.
// Only names and indices ever reach the client; emails stay server-side.
export function ProfileSwitcher({
  profiles,
  currentName,
  className,
}: {
  profiles: { name: string; index: number }[];
  currentName: string | null;
  className: string;
}) {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  const others = profiles.filter((p) => p.name !== currentName);
  if (others.length === 0) return null;

  return (
    <form
      action="/api/profile-login"
      method="post"
      onSubmit={(e) => {
        const password = sessionStorage.getItem(SHARED_PASSWORD_KEY);
        // No cached password (fresh tab, bookmarked link): don't submit an empty
        // one — send them through the normal sign-in flow instead.
        if (!password) {
          e.preventDefault();
          router.push("/login");
          return;
        }
        if (passwordRef.current) passwordRef.current.value = password;
      }}
    >
      <input ref={passwordRef} type="hidden" name="password" />
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
