/**
 * Shared validation for server (SSH) session IDs.
 * Used so dashboard, terminal, and stats only render when the session is valid.
 */
export function hasValidSessionId(s: string | null | undefined): s is string {
  return typeof s === "string" && s.length > 0 && s !== "undefined";
}
