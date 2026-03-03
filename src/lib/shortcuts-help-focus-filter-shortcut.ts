"use client";

/** Shortcuts Help dialog: "/" and FOCUS_FILTER_EVENT focus the dialog filter. Used by ShortcutsHelpDialog. */
import { useEffect, type RefObject } from "react";
import { FOCUS_FILTER_EVENT } from "@/lib/focus-filter-event";

/**
 * When the Shortcuts Help dialog is open, pressing "/" focuses the filter input
 * unless focus is already in an input, textarea, or select.
 * Also listens for FOCUS_FILTER_EVENT (from command palette "Focus filter") and focuses when dialog is open.
 * Uses capture phase so this runs before page-level "/" handlers when the dialog is open.
 */
export function useShortcutsHelpFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  dialogOpen: boolean
): void {
  useEffect(() => {
    if (!dialogOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const el = inputRef.current;
      if (!el) return;
      e.preventDefault();
      el.focus();
    };

    const onFocusFilterEvent = () => {
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener(FOCUS_FILTER_EVENT, onFocusFilterEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener(FOCUS_FILTER_EVENT, onFocusFilterEvent);
    };
  }, [dialogOpen, inputRef]);
}
