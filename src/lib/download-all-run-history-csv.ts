/**
 * Export full run history as CSV. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { toast } from "sonner";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";
import { formatDurationMs } from "@/lib/run-helpers";

/**
 * Build CSV content for the given run history entries.
 * Columns: timestamp, label, slot, exit_code, duration, output.
 * Entries are in chronological order (oldest first).
 */
export function buildRunHistoryCsv(entries: TerminalOutputHistoryEntry[]): string {
  const header = "timestamp,label,slot,exit_code,duration,output";
  const rows = [...entries]
    .reverse()
    .map((e) => {
      const timestamp = escapeCsvField(e.timestamp);
      const label = escapeCsvField(e.label);
      const slot = e.slot !== undefined ? String(e.slot) : "";
      const exitCode = e.exitCode !== undefined ? String(e.exitCode) : "";
      const duration = formatDurationMs(e.durationMs);
      const output = escapeCsvField(e.output ?? "");
      return `${timestamp},${label},${slot},${exitCode},${duration},${output}`;
    });
  return [header, ...rows].join("\n");
}

/**
 * Download the full terminal output history as a CSV file.
 * Columns: timestamp, label, slot, exit_code, duration, output.
 * Entries are in chronological order (oldest first).
 * Filename: run-history-{YYYY-MM-DD-HHmm}.csv
 * If entries is empty, shows a toast and does nothing.
 */
export function downloadAllRunHistoryCsv(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  const csv = buildRunHistoryCsv(entries);
  const filename = `run-history-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("History exported as CSV");
}

/**
 * Copy the given run history as CSV to the clipboard.
 * Same columns and format as download. If entries is empty, shows a toast and returns.
 */
export async function copyAllRunHistoryCsvToClipboard(
  entries: TerminalOutputHistoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  const csv = buildRunHistoryCsv(entries);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Run history copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
