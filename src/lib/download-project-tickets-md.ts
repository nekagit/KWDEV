/**
 * Export project tickets as Markdown. Used by Tickets tab and command palette.
 */
import { toast } from "sonner";
import type { ParsedTicket } from "@/lib/todos-kanban";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

function escapeMarkdownHeading(text: string): string {
  return text.replace(/#/g, "\\#");
}

/**
 * Build a single Markdown string for a list of project tickets.
 * Format: "# Project tickets", export timestamp, count, then each ticket as a section (number, title, priority, status, featureName, description).
 */
export function buildProjectTicketsMarkdown(
  tickets: ParsedTicket[],
  options?: { projectName?: string }
): string {
  if (tickets.length === 0) return "";

  const projectName = options?.projectName ?? "Project";
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Project tickets",
    "",
    `**Project:** ${escapeMarkdownHeading(projectName)}`,
    `Exported at ${exportedAt}. ${tickets.length} ticket(s).`,
    "",
    "---",
    "",
  ];

  for (const t of tickets) {
    const title = escapeMarkdownHeading((t.title ?? "").trim() || "Untitled");
    lines.push(`## #${t.number} — ${title}`);
    lines.push("");
    lines.push(`**Priority:** ${t.priority} · **Status:** ${t.status ?? (t.done ? "Done" : "Todo")} · **Feature:** ${escapeMarkdownHeading(t.featureName ?? "General")}`);
    lines.push("");
    if (t.description?.trim()) {
      lines.push(t.description.trim());
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download the given project tickets as a single Markdown file.
 * If the list is empty, shows a toast and returns.
 * Filename: project-tickets-{YYYY-MM-DD-HHmm}.md
 */
export function downloadProjectTicketsAsMarkdown(
  tickets: ParsedTicket[],
  options?: { projectName?: string }
): void {
  const markdown = buildProjectTicketsMarkdown(tickets, options);
  if (!markdown) {
    toast.info("No tickets to export");
    return;
  }

  const filename = `project-tickets-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Tickets exported as Markdown");
}

/**
 * Copy the given project tickets to the clipboard as Markdown.
 * Same format as downloadProjectTicketsAsMarkdown. If the list is empty, shows a toast and returns false.
 */
export async function copyProjectTicketsAsMarkdownToClipboard(
  tickets: ParsedTicket[],
  options?: { projectName?: string }
): Promise<boolean> {
  const markdown = buildProjectTicketsMarkdown(tickets, options);
  if (!markdown) {
    toast.info("No tickets to copy");
    return false;
  }
  return copyTextToClipboard(markdown);
}
