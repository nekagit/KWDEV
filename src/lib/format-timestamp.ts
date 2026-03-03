/**
 * Shared timestamp formatting for display and tooltips.
 * Uses locale-aware Intl formatting; invalid ISO strings are returned unchanged.
 */

/**
 * Format an ISO timestamp for list/table display (short date, medium time with seconds).
 * Example: "2/18/26, 2:30:45 PM"
 */
export function formatTimestampShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

/**
 * Format an ISO timestamp for tooltips and aria (full date and time).
 * Example: "February 18, 2026 at 2:30:45 PM" (locale-dependent).
 */
export function formatTimestampFull(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}
