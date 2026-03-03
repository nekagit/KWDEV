/**
 * Download a single run entry as plain text file. Used by Run tab History and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { toast } from "sonner";
import { triggerFileDownload, safeFilenameSegment, filenameTimestamp } from "@/lib/download-helpers";

const RUN_HEADER_PREFIX = "=== Run: ";
const RUN_HEADER_SUFFIX = " ===\n\n";

/**
 * Format a single run history entry as plain text (header line + output).
 * Same format as copy-single-run-as-plain-text for consistency.
 */
function formatSingleRun(entry: TerminalOutputHistoryEntry): string {
  const exitStr = entry.exitCode !== undefined ? `exit ${entry.exitCode}` : "—";
  const header = `${RUN_HEADER_PREFIX}${entry.label} | ${entry.timestamp} | ${exitStr}${RUN_HEADER_SUFFIX}`;
  return header + (entry.output || "(no output)");
}

/**
 * Download a single run history entry as a plain text file.
 * Filename: last-run-{safeLabel}-{timestamp}.txt.
 * Same section format as "Copy last run". Shows success toast.
 */
export function downloadSingleRunAsPlainText(
  entry: TerminalOutputHistoryEntry
): void {
  const text = formatSingleRun(entry);
  const safeLabel = safeFilenameSegment(entry.label ?? "run", 40, "run");
  const ts = filenameTimestamp();
  const filename = `last-run-${safeLabel}-${ts}.txt`;
  triggerFileDownload(text, filename, "text/plain");
  toast.success("Last run downloaded");
}
