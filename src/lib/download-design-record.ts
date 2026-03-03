/**
 * Download a single design record as Markdown. Used by project Design tab and command palette.
 */
import { toast } from "sonner";
import type { DesignRecord } from "@/types/design";
import {
  designRecordToMarkdown,
  type DesignRecordForExport,
} from "@/lib/design-to-markdown";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  safeNameForFile,
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

/**
 * Download a design record as a markdown file.
 * Requires record.config; if missing, shows toast and returns.
 * Filename: design-{name}-{YYYY-MM-DD-HHmm}.md
 */
export function downloadDesignRecord(record: DesignRecord): void {
  if (!record.config) {
    toast.info("No design config to download");
    return;
  }

  const exportRecord: DesignRecordForExport = {
    id: record.id,
    name: record.name,
    config: record.config,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };

  const markdown = designRecordToMarkdown(exportRecord);
  if (!markdown.trim()) {
    toast.info("Nothing to download");
    return;
  }

  const segment = safeNameForFile(record.name, "design");
  const filename = `design-${segment}-${filenameTimestamp()}.md`;

  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Design downloaded");
}

/**
 * Copy a design record as markdown to the clipboard.
 * Requires record.config; if missing, shows toast and returns.
 */
export async function copyDesignRecordToClipboard(record: DesignRecord): Promise<boolean> {
  if (!record.config) {
    toast.info("No design config to copy");
    return false;
  }

  const exportRecord: DesignRecordForExport = {
    id: record.id,
    name: record.name,
    config: record.config,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };

  const markdown = designRecordToMarkdown(exportRecord);
  if (!markdown.trim()) {
    toast.info("Nothing to copy");
    return false;
  }

  return copyTextToClipboard(markdown);
}
