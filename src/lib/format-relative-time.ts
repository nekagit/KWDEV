/**
 * Format a past timestamp as a human-readable relative time (e.g. "just now", "2 min ago").
 * Used for "Last refreshed" and similar UI. Does not localize; uses English.
 */
const MS_SEC = 1000;
const MS_MIN = 60 * MS_SEC;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

export function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  if (diff < 60 * MS_SEC) return "just now";
  if (diff < MS_HOUR) {
    const mins = Math.floor(diff / MS_MIN);
    return `${mins} min ago`;
  }
  if (diff < MS_DAY) {
    const hours = Math.floor(diff / MS_HOUR);
    return `${hours} h ago`;
  }
  const days = Math.floor(diff / MS_DAY);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
