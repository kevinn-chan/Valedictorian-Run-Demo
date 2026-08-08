"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShortcutOverlay } from "./shortcut-overlay";

export function GlobalKeys() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((s) => !s);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (input) {
          input.focus();
        } else {
          router.push("/search");
        }
        return;
      }

      if (e.key === "g" && !pendingG.current) {
        pendingG.current = true;
        clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          pendingG.current = false;
        }, 500);
        return;
      }

      if (pendingG.current) {
        pendingG.current = false;
        clearTimeout(gTimer.current);
        if (e.key === "d") {
          router.push("/");
        } else if (e.key === "r") {
          router.push("/review");
        }
      }
    },
    [router, showHelp],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!showHelp) return null;
  return <ShortcutOverlay onClose={() => setShowHelp(false)} />;
}
