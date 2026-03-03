/**
 * Run history aggregate stats for the Run tab History section.
 * Computes total runs, success/fail counts, and total duration from terminal output history.
 */

import type { TerminalOutputHistoryEntry } from "@/types/run";
import { formatDurationMs } from "@/lib/run-helpers";

export interface RunHistoryStats {
  totalRuns: number;
  successCount: number;
  failCount: number;
  totalDurationMs: number;
}

/**
 * Compute aggregate stats from run history entries.
 * successCount: exitCode === 0; failCount: exitCode !== 0 or undefined (treated as non-success).
 */
export function computeRunHistoryStats(
  entries: TerminalOutputHistoryEntry[]
): RunHistoryStats {
  let successCount = 0;
  let failCount = 0;
  let totalDurationMs = 0;

  for (const e of entries) {
    if (e.exitCode === 0) successCount++;
    else failCount++;
    if (e.durationMs != null && e.durationMs >= 0) totalDurationMs += e.durationMs;
  }

  return {
    totalRuns: entries.length,
    successCount,
    failCount,
    totalDurationMs,
  };
}

/**
 * Format total duration for display. Uses "Xh Ym" when >= 1 hour, else formatDurationMs.
 */
function formatTotalDurationMs(ms: number): string {
  if (ms <= 0) return "0";
  if (ms >= 3600 * 1000) {
    const h = Math.floor(ms / (3600 * 1000));
    const m = Math.floor((ms % (3600 * 1000)) / 60000);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return formatDurationMs(ms);
}

/**
 * Return a one-line summary string for the given stats, e.g.
 * "42 runs, 38 passed, 4 failed, 2h 15m total"
 */
export function formatRunHistoryStatsSummary(stats: RunHistoryStats): string {
  if (stats.totalRuns === 0) return "No runs";
  const parts: string[] = [];
  if (stats.successCount > 0) parts.push(`${stats.successCount} passed`);
  if (stats.failCount > 0) parts.push(`${stats.failCount} failed`);
  const statusPart = parts.length > 0 ? parts.join(", ") : "0 passed, 0 failed";
  const durationPart = formatTotalDurationMs(stats.totalDurationMs);
  return `${stats.totalRuns} runs, ${statusPart}, ${durationPart} total`;
}

/**
 * Compact summary for toolbar display, e.g. "38 passed, 4 failed · 2h 15m total".
 */
export function formatRunHistoryStatsToolbar(stats: RunHistoryStats): string {
  if (stats.totalRuns === 0) return "";
  const parts: string[] = [];
  if (stats.successCount > 0) parts.push(`${stats.successCount} passed`);
  if (stats.failCount > 0) parts.push(`${stats.failCount} failed`);
  const statusPart = parts.length > 0 ? parts.join(", ") : "0 passed, 0 failed";
  const durationPart = formatTotalDurationMs(stats.totalDurationMs);
  return `${statusPart} · ${durationPart} total`;
}
