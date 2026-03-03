"use client";

/** Project detail tabs: "/" and FOCUS_FILTER_EVENT focus the active tab's filter. Used by project tab components. */
import { useEffect, type RefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FOCUS_FILTER_EVENT } from "@/lib/focus-filter-event";

export type ProjectTabSlug = "design" | "architecture" | "worker" | "git";

/**
 * On a project detail page (/projects/[id]?tab=<tab>), pressing "/" focuses the
 * given input unless focus is already in an input, textarea, or select.
 * Also listens for FOCUS_FILTER_EVENT (from command palette "Focus filter") and focuses when tab matches.
 * Uses the Next.js app router pathname and search params.
 * Shared implementation for Design, Architecture, Run (worker), and Versioning (git) tabs.
 */
export function useProjectTabFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  tab: ProjectTabSlug
): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const match = pathname?.match(/^\/projects\/([^/]+)$/);
    if (!match || match[1] === "new") return;
    if (searchParams?.get("tab") !== tab) return;

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
  }, [pathname, searchParams, inputRef, tab]);
}
