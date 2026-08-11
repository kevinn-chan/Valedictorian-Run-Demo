"use client";

import { useEffect } from "react";

export function SnapshotTrigger() {
  useEffect(() => {
    fetch("/api/snapshot", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
