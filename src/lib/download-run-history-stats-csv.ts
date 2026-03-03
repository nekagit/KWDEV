/**
 * Export run history stats as CSV. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { computeRunHistoryStats, formatRunHistoryStatsSummary } from "@/lib/run-history-stats";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { toast } from "sonner";

const CSV_HEADER = "exportedAt,totalRuns,successCount,failCount,totalDurationMs,summary";

/**
 * Build a single-row CSV for run history stats.
 * Columns: exportedAt, totalRuns, successCount, failCount, totalDurationMs, summary.
 */
export function buildRunHistoryStatsCsv(
  entries: TerminalOutputHistoryEntry[]
): string {
  const stats = computeRunHistoryStats(entries);
  const summary = formatRunHistoryStatsSummary(stats);
  const exportedAt = new Date().toISOString();
  const row = [
    escapeCsvField(exportedAt),
    String(stats.totalRuns),
    String(stats.successCount),
    String(stats.failCount),
    String(stats.totalDurationMs),
    escapeCsvField(summary),
  ].join(",");
  return [CSV_HEADER, row].join("\n");
}

/**
 * Download run history stats as a CSV file.
 * Filename: run-history-stats-{timestamp}.csv
 * If entries is empty, shows toast and returns.
 */
export function downloadRunHistoryStatsAsCsv(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No run history");
    return;
  }
  const csv = buildRunHistoryStatsCsv(entries);
  const filename = `run-history-stats-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Run history stats exported as CSV");
}

/**
 * Copy run history stats as CSV to the clipboard.
 * Same columns as download. If entries is empty, shows toast and returns.
 */
export async function copyRunHistoryStatsAsCsvToClipboard(
  entries: TerminalOutputHistoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    toast.info("No run history");
    return;
  }
  const csv = buildRunHistoryStatsCsv(entries);
  await copyTextToClipboard(csv);
  toast.success("Run history stats copied as CSV");
}
