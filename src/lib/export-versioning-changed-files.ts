/**
 * Export versioning (changed files) as CSV or copy to clipboard. Used by Versioning tab and command palette.
 */
import { toast } from "sonner";
import { triggerFileDownload, filenameTimestamp } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build plain text list: one line per changed file (same format as git status -sb:
 * two-char status then path).
 */
export function buildChangedFilesPlainText(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

/**
 * Build Markdown content for the changed files list.
 * Each line is "XY path" (status + path); we emit "## Changed files (n)\n\n- `path` (XY)".
 */
export function buildChangedFilesMarkdown(lines: string[]): string {
  const trimmed = lines.filter(Boolean);
  if (trimmed.length === 0) return "";
  const header = `## Changed files (${trimmed.length})`;
  const bullets = trimmed.map((line) => {
    const status = line.slice(0, 2).trim() || "??";
    const path = line.slice(2).trim() || line;
    return `- \`${path}\` (${status})`;
  });
  return [header, "", ...bullets].join("\n");
}

/**
 * Copy the changed files list as plain text to the clipboard.
 * If lines are empty, shows a toast and returns false.
 */
export async function copyChangedFilesListToClipboard(
  lines: string[]
): Promise<boolean> {
  const text = buildChangedFilesPlainText(lines);
  if (!text.trim()) {
    toast.info("No changed files to copy");
    return false;
  }
  return copyTextToClipboard(text);
}

/**
 * Download the changed files list as a Markdown file.
 * Filename is changed-files-{filenameBase}-{timestamp}.md or changed-files-{timestamp}.md.
 * If lines are empty, shows a toast and does nothing.
 */
export function downloadChangedFilesAsMarkdown(
  lines: string[],
  filenameBase?: string
): void {
  const content = buildChangedFilesMarkdown(lines);
  if (!content) {
    toast.info("No changed files to download");
    return;
  }
  const base =
    filenameBase != null && filenameBase !== ""
      ? `changed-files-${filenameBase}`
      : "changed-files";
  const filename = `${base}-${filenameTimestamp()}.md`;
  triggerFileDownload(content, filename, "text/markdown;charset=utf-8");
  toast.success("Changed files downloaded as Markdown");
}
