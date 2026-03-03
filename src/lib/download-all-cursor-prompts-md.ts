/**
 * Export all Cursor prompts as Markdown. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";

export interface CursorPromptFileWithContent {
  relativePath: string;
  path: string;
  name: string;
  content: string;
  updatedAt: string;
}

function escapeMarkdownHeading(text: string): string {
  return text.replace(/#/g, "\\#");
}

/**
 * Build one markdown document with all .cursor prompt files.
 * Exported for unit tests and reuse by download/copy.
 */
export function buildCursorPromptsMarkdown(
  files: CursorPromptFileWithContent[],
  exportedAt: string
): string {
  const lines: string[] = [
    "# All .cursor Prompts (*.prompt.md)",
    "",
    `Exported: ${exportedAt}`,
    "",
    "---",
    "",
  ];

  for (const f of files) {
    const title = escapeMarkdownHeading(f.path);
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`**Updated:** ${f.updatedAt}`);
    lines.push("");
    lines.push(f.content.trim());
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download all .cursor *.prompt.md files as a single Markdown file.
 * Fetches content from /api/data/cursor-prompt-files-contents.
 * Filename: all-cursor-prompts-{YYYY-MM-DD-HHmm}.md
 */
export async function downloadAllCursorPromptsAsMarkdown(): Promise<void> {
  try {
    const res = await fetch("/api/data/cursor-prompt-files-contents");
    if (!res.ok) throw new Error("Failed to load .cursor prompts");
    const data = (await res.json()) as { files?: CursorPromptFileWithContent[] };
    const files = Array.isArray(data.files) ? data.files : [];
    if (files.length === 0) {
      toast.info("No .cursor prompts to export");
      return;
    }

    const exportedAt = new Date().toISOString();
    const markdown = buildCursorPromptsMarkdown(files, exportedAt);
    const filename = `all-cursor-prompts-${filenameTimestamp()}.md`;
    triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
    toast.success(".cursor prompts exported as Markdown");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Export failed");
  }
}

/**
 * Copy all .cursor *.prompt.md files to the clipboard as Markdown.
 * Same format as downloadAllCursorPromptsAsMarkdown (heading, timestamp, per-file sections).
 * Fetches content from /api/data/cursor-prompt-files-contents.
 * Empty list shows a toast and returns false.
 */
export async function copyAllCursorPromptsAsMarkdownToClipboard(): Promise<boolean> {
  try {
    const res = await fetch("/api/data/cursor-prompt-files-contents");
    if (!res.ok) throw new Error("Failed to load .cursor prompts");
    const data = (await res.json()) as { files?: CursorPromptFileWithContent[] };
    const files = Array.isArray(data.files) ? data.files : [];
    if (files.length === 0) {
      toast.info("No .cursor prompts to copy");
      return false;
    }
    const exportedAt = new Date().toISOString();
    const markdown = buildCursorPromptsMarkdown(files, exportedAt);
    return copyTextToClipboard(markdown);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Copy failed");
    return false;
  }
}
