/**
 * Custom event used to toggle the app sidebar (collapse/expand) from components
 * that don't have access to sidebar state (e.g. CommandPalette).
 * AppShell subscribes and toggles; CommandPalette dispatches when user selects "Toggle sidebar".
 */

export const SIDEBAR_TOGGLE_EVENT = "kwcode-toggle-sidebar";

/**
 * Dispatches the sidebar toggle event. The AppShell listener will toggle
 * sidebar collapsed state. Safe to call from any component.
 */
export function dispatchSidebarToggle(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
}
