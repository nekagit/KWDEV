"use client";

/**
 * Dashboard tab: "/" focuses the filter input. Used by SimpleDashboard.
 */
import { type RefObject } from "react";
import { usePageFocusFilterShortcut } from "@/lib/page-focus-filter-shortcut";

/**
 * On the Dashboard tab (home page at "/"), pressing "/" focuses the filter input
 * unless focus is already in an input, textarea, or select.
 * SimpleDashboard is only mounted when the Dashboard tab is active, so pathname "/" is sufficient.
 */
export function useDashboardFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>
): void {
  usePageFocusFilterShortcut(inputRef, "/");
}
