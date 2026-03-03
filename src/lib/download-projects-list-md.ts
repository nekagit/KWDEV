/**
 * Export projects list as Markdown. Used by command palette and Projects page.
 */
import { toast } from "sonner";
import type { Project } from "@/types/project";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

function escapePipe(s: string): string {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * Build Markdown for the projects list: title, exportedAt, count, then a table
 * with columns: Name, ID, Repo path, Description, Prompts, Tickets, Ideas.
 */
export function projectsListToMarkdown(projects: Project[]): string {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Projects list",
    "",
    `Exported: ${exportedAt}`,
    "",
    `Count: ${projects.length}`,
    "",
    "| Name | ID | Repo path | Description | Prompts | Tickets | Ideas |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const p of projects) {
    const name = escapePipe(p.name ?? "");
    const id = escapePipe(p.id ?? "");
    const repoPath = escapePipe(p.repoPath ?? "");
    const description = escapePipe(p.description ?? "");
    const prompts = String(Array.isArray(p.promptIds) ? p.promptIds.length : 0);
    const tickets = String(Array.isArray(p.ticketIds) ? p.ticketIds.length : 0);
    const ideas = String(Array.isArray(p.ideaIds) ? p.ideaIds.length : 0);
    lines.push(`| ${name} | ${id} | ${repoPath} | ${description} | ${prompts} | ${tickets} | ${ideas} |`);
  }
  return lines.join("\n");
}

/**
 * Download the given projects list as a Markdown file.
 * Filename: projects-list-{YYYY-MM-DD-HHmm}.md
 * If the list is empty, shows a toast and does nothing.
 */
export function downloadProjectsListAsMarkdown(projects: Project[]): void {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return;
  }
  const markdown = projectsListToMarkdown(projects);
  const filename = `projects-list-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Projects list exported as Markdown");
}

/**
 * Copy the given projects list as Markdown to the clipboard.
 * Same format as download. If the list is empty, shows a toast and returns false.
 */
export async function copyProjectsListAsMarkdownToClipboard(
  projects: Project[]
): Promise<boolean> {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return false;
  }
  const markdown = projectsListToMarkdown(projects);
  const ok = await copyTextToClipboard(markdown);
  if (ok) {
    toast.success("Projects list copied as Markdown");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
