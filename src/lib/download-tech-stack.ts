/**
 * Download tech stack as JSON or copy to clipboard. Used by Technologies page and command palette.
 */
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Shape of tech-stack.json: name?, description?, frontend?, backend?, tooling?
 */
export type TechStackExport = {
  name?: string;
  description?: string;
  frontend?: Record<string, string>;
  backend?: Record<string, string>;
  tooling?: Record<string, string>;
};

function escapePipe(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function renderCategoryTable(title: string, record: Record<string, string> | undefined): string {
  if (!record || Object.keys(record).length === 0) return "";
  const lines: string[] = [`## ${title}`, "", "| Technology | Description |", "| --- | --- |"];
  for (const [tech, desc] of Object.entries(record)) {
    lines.push(`| ${escapePipe(tech)} | ${escapePipe(desc ?? "")} |`);
  }
  return lines.join("\n") + "\n\n";
}

/**
 * Format the tech stack as Markdown.
 * Structure: # title, export timestamp, optional description, then Frontend/Backend/Tooling tables.
 */
export function techStackToMarkdown(data: TechStackExport): string {
  const title = (data.name ?? "Tech stack").trim() || "Tech stack";
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    `# ${title}`,
    "",
    `Exported: ${exportedAt}`,
    "",
  ];
  if (data.description?.trim()) {
    lines.push(data.description.trim(), "", "---", "");
  }
  lines.push(renderCategoryTable("Frontend", data.frontend));
  lines.push(renderCategoryTable("Backend", data.backend));
  lines.push(renderCategoryTable("Tooling", data.tooling));
  return lines.join("\n").trimEnd();
}

/**
 * Download the current tech stack as a Markdown file.
 * Filename: tech-stack-{YYYY-MM-DD-HHmm}.md
 * If data is null/undefined, shows a toast and does nothing.
 */
export function downloadTechStackAsMarkdown(data: TechStackExport | null | undefined): void {
  if (data == null) {
    toast.info("No tech stack to export");
    return;
  }
  const markdown = techStackToMarkdown(data);
  const filename = `tech-stack-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Tech stack exported as Markdown");
}

/**
 * Copy the current tech stack as Markdown to the clipboard.
 * Same format as download (title, export timestamp, Frontend/Backend/Tooling tables).
 * If data is null/undefined, shows a toast and returns false.
 */
export async function copyTechStackAsMarkdownToClipboard(
  data: TechStackExport | null | undefined
): Promise<boolean> {
  if (data == null) {
    toast.info("No tech stack to copy");
    return false;
  }
  const markdown = techStackToMarkdown(data);
  return copyTextToClipboard(markdown);
}

/**
 * Download the current tech stack as a JSON file.
 * Filename: tech-stack-{YYYY-MM-DD-HHmm}.json
 * If data is null/undefined, shows a toast and does nothing.
 */
export function downloadTechStack(data: TechStackExport | null | undefined): void {
  if (data == null) {
    toast.info("No tech stack to export");
    return;
  }
  const json = JSON.stringify(data, null, 2);
  const filename = `tech-stack-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Tech stack exported");
}
