"use client";

/** Project Versioning tab: "/" focuses the file path filter. Used by project Git/Versioning tab. */
import { type RefObject } from "react";
import { useProjectTabFocusFilterShortcut } from "@/lib/project-tab-focus-filter-shortcut";

/**
 * On a project's Versioning (Git) tab (/projects/[id]?tab=git), pressing "/" focuses the
 * "Filter file paths" input in the Current project files section unless focus is already
 * in an input, textarea, or select. Uses the Next.js app router pathname and search params.
 */
export function useProjectVersioningFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>
): void {
  useProjectTabFocusFilterShortcut(inputRef, "git");
}
