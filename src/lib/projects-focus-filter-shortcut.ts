"use client";

/**
 * Projects page: "/" focuses the filter input. Used by ProjectsListContent.
 */
import { type RefObject } from "react";
import { usePageFocusFilterShortcut } from "@/lib/page-focus-filter-shortcut";

/**
 * On the Projects page (/projects), pressing "/" focuses the filter input
 * unless focus is already in an input, textarea, or select.
 * Uses the Next.js app router pathname.
 */
export function useProjectsFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>
): void {
  usePageFocusFilterShortcut(inputRef, "/projects");
}
