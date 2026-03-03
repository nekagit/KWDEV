"use client";

/** Prompts page: "/" focuses the filter input. Used by PromptsPageContent. */
import { type RefObject } from "react";
import { usePageFocusFilterShortcut } from "@/lib/page-focus-filter-shortcut";

/**
 * On the Prompts page (/prompts), pressing "/" focuses the filter input
 * unless focus is already in an input, textarea, or select.
 * Uses the Next.js app router pathname.
 */
export function usePromptsFocusFilterShortcut(
  inputRef: RefObject<HTMLInputElement | null>
): void {
  usePageFocusFilterShortcut(inputRef, "/prompts");
}
