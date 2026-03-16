"use client";

/**
 * Shared hook: "/" and FOCUS_FILTER_EVENT focus the filter input when pathname matches. Used by Home, Projects, Prompts, Ideas.
 */
import { useEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { FOCUS_FILTER_EVENT } from "@/lib/focus-filter-event";

/**
 * On a page with the given pathname, pressing "/" focuses the given input
 * unless focus is already in an input, textarea, or select.
 * Also listens for FOCUS_FILTER_EVENT (from command palette "Focus filter") and focuses when pathname matches.
 * Uses the Next.js app router pathname. Shared implementation for Home,
 * Projects, Prompts, and Ideas pages.
 */
export function usePageFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  pathnameMatch: string
): void {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== pathnameMatch) return;

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

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(FOCUS_FILTER_EVENT, onFocusFilterEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(FOCUS_FILTER_EVENT, onFocusFilterEvent);
    };
  }, [pathname, pathnameMatch, inputRef]);
}
