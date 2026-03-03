/**
 * Filter run history entries by a search query.
 * Matches against both label and output (case-insensitive).
 * Used by the Run tab History section. See ADR 0223.
 */

import type { TerminalOutputHistoryEntry } from "@/types/run";

/**
 * Filters run history entries by query: a run is included if the trimmed,
 * case-insensitive query appears in the run's label or output.
 * Empty or whitespace-only query returns all entries unchanged.
 */
export function filterRunHistoryByQuery(
  entries: TerminalOutputHistoryEntry[],
  query: string
): TerminalOutputHistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (h) =>
      h.label.toLowerCase().includes(q) ||
      (typeof h.output === "string" && h.output.toLowerCase().includes(q))
  );
}
