/**
 * Copies a single run entry as plain text to the clipboard.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";

const RUN_HEADER_PREFIX = "=== Run: ";
const RUN_HEADER_SUFFIX = " ===\n\n";

/**
 * Format a single run history entry as plain text (header line + output).
 * Same format as each section in copy-all-run-history "Copy all".
 */
function formatSingleRun(entry: TerminalOutputHistoryEntry): string {
  const exitStr = entry.exitCode !== undefined ? `exit ${entry.exitCode}` : "—";
  const header = `${RUN_HEADER_PREFIX}${entry.label} | ${entry.timestamp} | ${exitStr}${RUN_HEADER_SUFFIX}`;
  return header + (entry.output || "(no output)");
}

/**
 * Copy a single run history entry to the clipboard as plain text.
 * Uses the same section format as "Copy all" run history. Shows success or error toast.
 */
export function copySingleRunAsPlainTextToClipboard(
  entry: TerminalOutputHistoryEntry
): void {
  const text = formatSingleRun(entry);
  copyTextToClipboard(text)
    .then(() => toast.success("Run copied to clipboard"))
    .catch(() => toast.error("Failed to copy"));
}
