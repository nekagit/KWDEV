"use client";

/** Command Palette Announcer component. */
import { useState, useEffect, useRef } from "react";

const ANNOUNCE_MESSAGE = "Command palette opened. Type to search.";
const CLEAR_DELAY_MS = 3000;

/**
 * Visually hidden aria-live region that announces when the command palette opens (ADR 0244).
 * When `open` transitions from false to true, announces a brief message so screen reader users
 * know the context has changed; clears after a delay so the region is ready for the next open.
 */
export function CommandPaletteAnnouncer({ open }: { open: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setMessage(ANNOUNCE_MESSAGE);
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (message === null) return;
    const id = setTimeout(() => setMessage(null), CLEAR_DELAY_MS);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div
      aria-live="polite"
      aria-atomic
      role="status"
      className="sr-only"
      aria-relevant="additions text"
    >
      {message ?? ""}
    </div>
  );
}
