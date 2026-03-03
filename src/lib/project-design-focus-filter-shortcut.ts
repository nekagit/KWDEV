"use client";

/** Project Design tab: "/" focuses the designs filter. Used by project Design tab. */
import { type RefObject } from "react";
import { useProjectTabFocusFilterShortcut } from "@/lib/project-tab-focus-filter-shortcut";

/**
 * On a project's Design tab (/projects/[id]?tab=design), pressing "/" focuses the
 * "Filter designs by name" input unless focus is already in an input,
 * textarea, or select. Uses the Next.js app router pathname and search params.
 */
export function useProjectDesignFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>
): void {
  useProjectTabFocusFilterShortcut(inputRef, "design");
}
