/**
 * Download full run history as a single plain-text file. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { toast } from "sonner";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";

const SEPARATOR = "\n\n";
const RUN_HEADER_PREFIX = "=== Run: ";
const RUN_HEADER_SUFFIX = " ===\n\n";

/**
 * Format a single history entry as a section: header line + output.
 * History is newest-first in the UI; we write in reverse order so the file is chronological (oldest first).
 */
function formatEntry(entry: TerminalOutputHistoryEntry): string {
  const exitStr = entry.exitCode !== undefined ? `exit ${entry.exitCode}` : "—";
  const header = `${RUN_HEADER_PREFIX}${entry.label} | ${entry.timestamp} | ${exitStr}${RUN_HEADER_SUFFIX}`;
  return header + (entry.output || "(no output)");
}

/**
 * Download the full terminal output history as a single plain-text file.
 * Filename: run-history-{YYYY-MM-DD-HHmm}.txt
 * Entries are written chronological order (oldest first) with clear separators.
 * If entries is empty, shows a toast and does nothing.
 */
export function downloadAllRunHistory(entries: TerminalOutputHistoryEntry[]): void {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  // UI shows newest first; for the file we use chronological (oldest first) by reversing.
  const reversed = [...entries].reverse();
  const body = reversed.map(formatEntry).join(SEPARATOR);
  const filename = `run-history-${filenameTimestamp()}.txt`;
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("History exported");
}
