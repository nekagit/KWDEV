/**
 * Copy the current page URL (origin + pathname + search + hash) to the clipboard.
 * Used by the command palette action "Copy current page URL".
 * SSR-safe: no-op when window is undefined (returns false).
 */

import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build the full URL of the current page (origin + pathname + search + hash).
 * Returns empty string when not in a browser (SSR).
 */
export function getCurrentPageUrl(): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname, search, hash } = window.location;
  return `${origin}${pathname}${search}${hash}`;
}

/**
 * Copy the current page URL to the clipboard and show a toast.
 * Returns true if copy succeeded, false otherwise (e.g. SSR or empty URL).
 */
export async function copyCurrentPageUrlToClipboard(): Promise<boolean> {
  const url = getCurrentPageUrl();
  if (!url) return false;
  return copyTextToClipboard(url);
}
