"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ponytail: 4s polling while any file is compiling — swap for Supabase
// realtime if the refresh flicker ever bothers anyone.
export function StatusPoller() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
