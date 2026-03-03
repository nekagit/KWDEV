/**
 * Copies run history stats summary (counts, duration) to the clipboard.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { computeRunHistoryStats, formatRunHistoryStatsSummary } from "@/lib/run-history-stats";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";

/**
 * Copy run history aggregate stats (runs, passed, failed, total duration) to the clipboard.
 * Uses the same summary format as the Run tab toolbar. If there are no entries, shows a toast
 * and does not copy.
 */
export function copyRunHistoryStatsSummaryToClipboard(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No run history");
    return;
  }
  const stats = computeRunHistoryStats(entries);
  const text = formatRunHistoryStatsSummary(stats);
  copyTextToClipboard(text);
}
