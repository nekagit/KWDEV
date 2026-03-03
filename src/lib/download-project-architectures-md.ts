/**
 * Export project architectures as Markdown. Used by project Architecture tab and command palette.
 */
import { toast } from "sonner";
import type { ArchitectureRecord } from "@/types/architecture";
import { architectureRecordToMarkdown } from "@/lib/architecture-to-markdown";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

/**
 * Build a single Markdown string for a list of architecture records.
 * Format: "# Project architectures", export timestamp, count, then each architecture as a section (same as architectureRecordToMarkdown).
 */
export function buildProjectArchitecturesMarkdown(
  architectures: ArchitectureRecord[]
): string {
  if (architectures.length === 0) return "";

  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Project architectures",
    "",
    `Exported at ${exportedAt}. ${architectures.length} architecture(s).`,
    "",
    "---",
    "",
  ];

  for (const record of architectures) {
    lines.push(architectureRecordToMarkdown(record));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download the given architecture records as a single Markdown file.
 * If the list is empty, shows a toast and returns.
 * Filename: project-architectures-{YYYY-MM-DD-HHmm}.md
 */
export function downloadProjectArchitecturesAsMarkdown(
  architectures: ArchitectureRecord[]
): void {
  const markdown = buildProjectArchitecturesMarkdown(architectures);
  if (!markdown) {
    toast.info("No architectures to export");
    return;
  }

  const filename = `project-architectures-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Architectures exported as Markdown");
}

/**
 * Copy the given architecture records to the clipboard as Markdown.
 * Same format as downloadProjectArchitecturesAsMarkdown. If the list is empty, shows a toast and returns false.
 */
export async function copyProjectArchitecturesAsMarkdownToClipboard(
  architectures: ArchitectureRecord[]
): Promise<boolean> {
  const markdown = buildProjectArchitecturesMarkdown(architectures);
  if (!markdown) {
    toast.info("No architectures to copy");
    return false;
  }
  return copyTextToClipboard(markdown);
}
