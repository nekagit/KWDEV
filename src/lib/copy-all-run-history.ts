/**
 * Copies full run history (all entries) as plain text to the clipboard.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";

const SEPARATOR = "\n\n";
const RUN_HEADER_PREFIX = "=== Run: ";
const RUN_HEADER_SUFFIX = " ===\n\n";

/**
 * Format a single history entry as a section: header line + output.
 * Uses chronological order (oldest first) by reversing the list before formatting.
 */
function formatEntry(entry: TerminalOutputHistoryEntry): string {
  const exitStr = entry.exitCode !== undefined ? `exit ${entry.exitCode}` : "—";
  const header = `${RUN_HEADER_PREFIX}${entry.label} | ${entry.timestamp} | ${exitStr}${RUN_HEADER_SUFFIX}`;
  return header + (entry.output || "(no output)");
}

/**
 * Copy the given run history entries to the clipboard as plain text.
 * Entries are written in chronological order (oldest first) with the same
 * format as the "Download all" export. If entries is empty, shows a toast
 * and does nothing.
 */
export function copyAllRunHistoryToClipboard(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No history to copy");
    return;
  }

  const reversed = [...entries].reverse();
  const text = reversed.map(formatEntry).join(SEPARATOR);

  copyTextToClipboard(text)
    .then(() => toast.success("Run history copied to clipboard"))
    .catch(() => toast.error("Failed to copy"));
}
