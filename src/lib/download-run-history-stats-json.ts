/**
 * Export run history stats as JSON. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { computeRunHistoryStats, formatRunHistoryStatsSummary } from "@/lib/run-history-stats";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { toast } from "sonner";

export interface RunHistoryStatsJsonPayload {
  exportedAt: string;
  totalRuns: number;
  successCount: number;
  failCount: number;
  totalDurationMs: number;
  summary: string;
}

/**
 * Build a JSON-serializable payload for run history stats.
 */
export function buildRunHistoryStatsJsonPayload(
  entries: TerminalOutputHistoryEntry[]
): RunHistoryStatsJsonPayload {
  const stats = computeRunHistoryStats(entries);
  const summary = formatRunHistoryStatsSummary(stats);
  return {
    exportedAt: new Date().toISOString(),
    totalRuns: stats.totalRuns,
    successCount: stats.successCount,
    failCount: stats.failCount,
    totalDurationMs: stats.totalDurationMs,
    summary,
  };
}

/**
 * Download run history stats as a JSON file.
 * Filename: run-history-stats-{timestamp}.json
 */
export function downloadRunHistoryStatsAsJson(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No run history");
    return;
  }
  const payload = buildRunHistoryStatsJsonPayload(entries);
  const content = JSON.stringify(payload, null, 2);
  const filename = `run-history-stats-${filenameTimestamp()}.json`;
  triggerFileDownload(content, filename, "application/json;charset=utf-8");
  toast.success("Run history stats exported as JSON");
}

/**
 * Copy run history stats as pretty-printed JSON to the clipboard.
 */
export async function copyRunHistoryStatsAsJsonToClipboard(
  entries: TerminalOutputHistoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    toast.info("No run history");
    return;
  }
  const payload = buildRunHistoryStatsJsonPayload(entries);
  const content = JSON.stringify(payload, null, 2);
  await copyTextToClipboard(content);
}
