/**
 * Recently viewed projects for command palette ordering.
 * Persists last N project IDs in localStorage (most recent first).
 */

const STORAGE_KEY = "kwcode-recent-project-ids";
const MAX_RECENT = 10;

/**
 * Returns the list of recently visited project IDs (most recent first).
 * Safe to call in SSR; returns [] when window is undefined.
 */
export function getRecentProjectIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/**
 * Records a visit to a project. Call when the user lands on a project detail page.
 * Prepends the id, dedupes, keeps at most MAX_RECENT, and writes back to localStorage.
 */
export function recordProjectVisit(projectId: string): void {
  if (typeof window === "undefined" || !projectId.trim()) return;
  const recent = getRecentProjectIds();
  const next = [projectId.trim(), ...recent.filter((id) => id !== projectId.trim())].slice(
    0,
    MAX_RECENT
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota or other storage errors
  }
}
