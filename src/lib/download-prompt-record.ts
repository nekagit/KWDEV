/**
 * Download a single prompt record as Markdown. Used by Prompts tab and command palette.
 */
import { toast } from "sonner";
import {
  safeNameForFile,
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Download a prompt record as a markdown file.
 * Filename: prompt-{title}-{YYYY-MM-DD-HHmm}.md
 */
export function downloadPromptRecord(title: string, content: string): void {
  if (content == null || String(content).trim() === "") {
    toast.info("Nothing to download");
    return;
  }
  const segment = safeNameForFile(title, "prompt");
  const filename = `prompt-${segment}-${filenameTimestamp()}.md`;
  triggerFileDownload(content, filename, "text/markdown;charset=utf-8");
  toast.success("Prompt downloaded");
}

/**
 * Copy a prompt record as formatted markdown to the clipboard.
 * Format: "# {title}\n\n{content}". Empty content shows a toast and returns false.
 */
export async function copyPromptRecordToClipboard(
  title: string,
  content: string
): Promise<boolean> {
  if (content == null || String(content).trim() === "") {
    toast.info("Nothing to copy");
    return false;
  }
  const markdown = `# ${title}\n\n${content}`;
  return copyTextToClipboard(markdown);
}
