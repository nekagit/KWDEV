/**
 * Export full run history as JSON. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Serializable shape for one run entry (matches single-run JSON export).
 */
function entryToPayload(entry: TerminalOutputHistoryEntry) {
  return {
    id: entry.id,
    runId: entry.runId,
    label: entry.label,
    output: entry.output,
    timestamp: entry.timestamp,
    exitCode: entry.exitCode,
    slot: entry.slot,
    durationMs: entry.durationMs,
  };
}

/**
 * Build the JSON payload for run history export. Same shape as download.
 * Entries are in chronological order (oldest first).
 */
export function buildRunHistoryJsonPayload(entries: TerminalOutputHistoryEntry[]): {
  exportedAt: string;
  entries: ReturnType<typeof entryToPayload>[];
} {
  const reversed = [...entries].reverse();
  return {
    exportedAt: new Date().toISOString(),
    entries: reversed.map(entryToPayload),
  };
}

/**
 * Download the full terminal output history as a single JSON file.
 * Payload: { exportedAt: string, entries: Array<{ id, runId, label, output, timestamp, exitCode, slot, durationMs }> }.
 * Entries are in chronological order (oldest first), matching the .txt export.
 * Filename: run-history-{YYYY-MM-DD-HHmm}.json
 * If entries is empty, shows a toast and does nothing.
 */
export function downloadAllRunHistoryJson(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  const payload = buildRunHistoryJsonPayload(entries);
  const json = JSON.stringify(payload, null, 2);
  const filename = `run-history-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("History exported as JSON");
}

/**
 * Copy the given run history as pretty-printed JSON to the clipboard.
 * Same payload as download. If entries is empty, shows a toast and returns.
 */
export async function copyAllRunHistoryJsonToClipboard(
  entries: TerminalOutputHistoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  const payload = buildRunHistoryJsonPayload(entries);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Run history copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
