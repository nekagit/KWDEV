/**
 * Custom event for "Focus filter" from command palette.
 * Pages that have a filter input listen for this and focus their input when the current page/tab matches.
 * See ADR 0254.
 */

export const FOCUS_FILTER_EVENT = "kwcode-focus-filter";

/**
 * Dispatch the focus-filter event so any active page/tab with a filter can focus its input.
 * SSR-safe: no-op when window is undefined.
 */
export function dispatchFocusFilterEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FOCUS_FILTER_EVENT));
}
