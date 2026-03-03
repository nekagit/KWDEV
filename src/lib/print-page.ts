/**
 * Triggers the browser print dialog for the current page.
 * Used by PrintButton and other "Print current page" UI.
 * No-op when window is undefined (e.g. SSR).
 */
export function triggerPrint(): void {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}
