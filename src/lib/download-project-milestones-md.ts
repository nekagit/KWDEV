/**
 * Export project milestones as Markdown. Used by Milestones tab and command palette.
 */
import { toast } from "sonner";
import type { MilestoneRecord } from "@/types/milestone";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

function escapeMarkdownHeading(text: string): string {
  return text.replace(/#/g, "\\#");
}

export interface BuildProjectMilestonesMarkdownOptions {
  projectName?: string;
}

/**
 * Build a single Markdown string for a list of project milestones.
 * Format: "# Project milestones", project name, exportedAt, count, then each milestone as a section (name, slug, id, dates, content).
 */
export function buildProjectMilestonesMarkdown(
  milestones: MilestoneRecord[],
  options?: BuildProjectMilestonesMarkdownOptions
): string {
  if (milestones.length === 0) return "";

  const projectName = options?.projectName ?? "Project";
  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Project milestones",
    "",
    `**Project:** ${escapeMarkdownHeading(projectName)}`,
    `Exported at ${exportedAt}. ${milestones.length} milestone(s).`,
    "",
    "---",
    "",
  ];

  for (const m of milestones) {
    const name = escapeMarkdownHeading((m.name ?? "").trim() || "Untitled");
    lines.push(`## ${name}`);
    lines.push("");
    lines.push(`**Slug:** \`${(m.slug ?? "").replace(/`/g, "\\`")}\` · **ID:** ${m.id}`);
    if (m.created_at) {
      lines.push(`**Created:** ${m.created_at}`);
    }
    if (m.updated_at) {
      lines.push(`**Updated:** ${m.updated_at}`);
    }
    lines.push("");
    if (m.content?.trim()) {
      lines.push(m.content.trim());
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download the given project milestones as a single Markdown file.
 * If the list is empty, shows a toast and returns.
 * Filename: project-milestones-{YYYY-MM-DD-HHmm}.md
 */
export function downloadProjectMilestonesAsMarkdown(
  milestones: MilestoneRecord[],
  options?: BuildProjectMilestonesMarkdownOptions
): void {
  const markdown = buildProjectMilestonesMarkdown(milestones, options);
  if (!markdown) {
    toast.info("No milestones to export");
    return;
  }

  const filename = `project-milestones-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Milestones exported as Markdown");
}

/**
 * Copy the given project milestones to the clipboard as Markdown.
 * Same format as downloadProjectMilestonesAsMarkdown. If the list is empty, shows a toast and returns false.
 */
export async function copyProjectMilestonesAsMarkdownToClipboard(
  milestones: MilestoneRecord[],
  options?: BuildProjectMilestonesMarkdownOptions
): Promise<boolean> {
  const markdown = buildProjectMilestonesMarkdown(milestones, options);
  if (!markdown) {
    toast.info("No milestones to export");
    return false;
  }

  const ok = await copyTextToClipboard(markdown);
  if (ok) {
    toast.success("Milestones copied as Markdown");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
