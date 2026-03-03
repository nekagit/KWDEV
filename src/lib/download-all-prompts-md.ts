/**
 * Export all prompts (DB) as Markdown. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface PromptRecordForExport {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function escapeMarkdownHeading(text: string): string {
  return text.replace(/#/g, "\\#");
}

/**
 * Build markdown content for the given prompts.
 */
function promptsToMarkdown(prompts: PromptRecordForExport[], exportedAt: string): string {
  const lines: string[] = [
    "# All Prompts (General)",
    "",
    `Exported: ${exportedAt}`,
    "",
    "---",
    "",
  ];

  for (const p of prompts) {
    const title = escapeMarkdownHeading((p.title ?? "").trim() || "Untitled");
    const category = p.category ?? "";
    const content = (p.content ?? "").trim();
    const created = p.created_at ?? "";
    const updated = p.updated_at ?? "";

    lines.push(`## ${title} (id: ${p.id})`);
    lines.push("");
    if (category) lines.push(`**Category:** ${category}`);
    if (created) lines.push(`**Created:** ${created}`);
    if (updated && updated !== created) lines.push(`**Updated:** ${updated}`);
    lines.push("");
    if (content) {
      lines.push(content);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download all general prompt records as a single Markdown file.
 * Filename: all-prompts-{YYYY-MM-DD-HHmm}.md
 */
export function downloadAllPromptsAsMarkdown(prompts: PromptRecordForExport[]): void {
  if (prompts.length === 0) {
    toast.info("No prompts to export");
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = promptsToMarkdown(prompts, exportedAt);
  const filename = `all-prompts-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Prompts exported as Markdown");
}

/**
 * Copy all general prompt records to the clipboard as Markdown.
 * Same format as downloadAllPromptsAsMarkdown (heading, timestamp, per-prompt sections).
 * Empty list shows a toast and returns false.
 */
export async function copyAllPromptsAsMarkdownToClipboard(
  prompts: PromptRecordForExport[]
): Promise<boolean> {
  if (prompts.length === 0) {
    toast.info("No prompts to copy");
    return false;
  }
  const exportedAt = new Date().toISOString();
  const markdown = promptsToMarkdown(prompts, exportedAt);
  return copyTextToClipboard(markdown);
}
