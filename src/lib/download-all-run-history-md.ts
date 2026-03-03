/**
 * Export full run history as Markdown. Used by Run tab and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { toast } from "sonner";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Format a single history entry as a Markdown section: ## Run: label, metadata block, fenced code for output.
 * History is newest-first in the UI; we write in reverse order so the file is chronological (oldest first).
 */
function formatEntryAsMarkdown(entry: TerminalOutputHistoryEntry): string {
  const lines: string[] = [];
  lines.push(`## Run: ${entry.label}`);
  lines.push("");
  lines.push(`- **ID:** \`${entry.id}\``);
  lines.push(`- **Timestamp:** ${entry.timestamp}`);
  if (entry.exitCode !== undefined) {
    lines.push(`- **Exit code:** ${entry.exitCode}`);
  }
  if (entry.durationMs !== undefined) {
    lines.push(`- **Duration:** ${entry.durationMs} ms`);
  }
  if (entry.slot !== undefined) {
    lines.push(`- **Slot:** ${entry.slot}`);
  }
  lines.push("");
  const output = (entry.output ?? "").trim() || "(no output)";
  lines.push("```");
  lines.push(output);
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

/**
 * Build the full run history as a single Markdown string (chronological, with header and export info).
 * Used by both download and copy-to-clipboard.
 */
function buildRunHistoryMarkdown(entries: TerminalOutputHistoryEntry[]): string {
  const reversed = [...entries].reverse();
  return [
    "# Run history",
    "",
    `Exported at ${new Date().toISOString()}. ${entries.length} run(s).`,
    "",
    "---",
    "",
    ...reversed.map(formatEntryAsMarkdown),
  ].join("\n");
}

/**
 * Download the full terminal output history as a single Markdown file.
 * Format: # Run history, then for each entry (chronological): ## Run: label, metadata, fenced code block.
 * Filename: run-history-{YYYY-MM-DD-HHmm}.md
 * If entries is empty, shows a toast and does nothing.
 */
export function downloadAllRunHistoryMarkdown(
  entries: TerminalOutputHistoryEntry[]
): void {
  if (entries.length === 0) {
    toast.info("No history to export");
    return;
  }

  const body = buildRunHistoryMarkdown(entries);
  const filename = `run-history-${filenameTimestamp()}.md`;
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("History exported as Markdown");
}

/**
 * Copy the full terminal output history to the clipboard as Markdown.
 * Same format as downloadAllRunHistoryMarkdown: # Run history, then for each entry (chronological): ## Run: label, metadata, fenced code block.
 * If entries is empty, shows a toast and does nothing.
 */
export async function copyAllRunHistoryMarkdownToClipboard(
  entries: TerminalOutputHistoryEntry[]
): Promise<boolean> {
  if (entries.length === 0) {
    toast.info("No history to copy");
    return false;
  }
  const markdown = buildRunHistoryMarkdown(entries);
  return copyTextToClipboard(markdown);
}
