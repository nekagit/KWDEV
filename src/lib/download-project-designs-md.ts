/**
 * Export project designs as Markdown. Used by project Design tab and command palette.
 */
import { toast } from "sonner";
import type { DesignRecord } from "@/types/design";
import {
  designRecordToMarkdown,
  type DesignRecordForExport,
} from "@/lib/design-to-markdown";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

/**
 * Build a single Markdown string for a list of design records.
 * Only records with config are included. Format: "# Project designs", export timestamp, count, then each design as a section (same as designRecordToMarkdown).
 */
export function buildProjectDesignsMarkdown(
  designs: DesignRecord[]
): string {
  const withConfig = designs.filter(
    (d): d is DesignRecord & { config: NonNullable<DesignRecord["config"]> } =>
      Boolean(d.config)
  );
  if (withConfig.length === 0) return "";

  const exportedAt = new Date().toISOString();
  const lines: string[] = [
    "# Project designs",
    "",
    `Exported at ${exportedAt}. ${withConfig.length} design(s).`,
    "",
    "---",
    "",
  ];

  for (const record of withConfig) {
    const exportRecord: DesignRecordForExport = {
      id: record.id,
      name: record.name,
      config: record.config,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
    lines.push(designRecordToMarkdown(exportRecord));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Download the given design records as a single Markdown file.
 * Only designs with config are included. If none have config, shows a toast and returns.
 * Filename: project-designs-{YYYY-MM-DD-HHmm}.md
 */
export function downloadProjectDesignsAsMarkdown(
  designs: DesignRecord[]
): void {
  const markdown = buildProjectDesignsMarkdown(designs);
  if (!markdown) {
    toast.info("No design configs to export");
    return;
  }

  const filename = `project-designs-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Designs exported as Markdown");
}

/**
 * Copy the given design records to the clipboard as Markdown.
 * Same format as downloadProjectDesignsAsMarkdown. If no designs have config, shows a toast and returns false.
 */
export async function copyProjectDesignsAsMarkdownToClipboard(
  designs: DesignRecord[]
): Promise<boolean> {
  const markdown = buildProjectDesignsMarkdown(designs);
  if (!markdown) {
    toast.info("No design configs to copy");
    return false;
  }
  return copyTextToClipboard(markdown);
}
