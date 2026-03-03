/**
 * Download a single run entry as Markdown. Used by Run tab History and command palette.
 */
import type { TerminalOutputHistoryEntry } from "@/types/run";
import {
  safeFilenameSegment,
  filenameTimestamp,
  downloadBlob,
} from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Format a single history entry as Markdown: heading, metadata, fenced code block for output.
 * Same structure as each section in download-all-run-history-md.
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
 * Build the full Markdown string for a single run (section + exported timestamp).
 * Used by both download and copy. Pass optional exportedAt for deterministic tests.
 */
export function buildSingleRunMarkdown(
  entry: TerminalOutputHistoryEntry,
  exportedAt?: string
): string {
  const at = exportedAt ?? new Date().toISOString();
  return [
    formatEntryAsMarkdown(entry).trim(),
    "",
    `Exported at ${at}.`,
  ].join("\n");
}

/**
 * Download a single run history entry as a Markdown file.
 * Format: ## Run: label, metadata, fenced code block (same as in "Download all as Markdown").
 * Filename: run-{label}-{YYYY-MM-DD-HHmm}.md
 */
export function downloadRunAsMarkdown(entry: TerminalOutputHistoryEntry): void {
  const segment = safeFilenameSegment(entry.label, "run");
  const filename = `run-${segment}-${filenameTimestamp()}.md`;
  const body = buildSingleRunMarkdown(entry);

  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * Copy a single run history entry to the clipboard as Markdown.
 * Same format as downloadRunAsMarkdown: ## Run: label, metadata, fenced code block.
 * Returns a Promise that resolves to true if copy succeeded, false otherwise.
 */
export async function copyRunAsMarkdownToClipboard(
  entry: TerminalOutputHistoryEntry
): Promise<boolean> {
  const body = buildSingleRunMarkdown(entry);
  return copyTextToClipboard(body);
}
