/**
 * Export project designs as JSON. Used by project Design tab and command palette.
 */
import { toast } from "sonner";
import type { DesignRecord } from "@/types/design";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build the JSON payload for list export. Same shape as download.
 */
export function buildProjectDesignsJsonPayload(
  designs: DesignRecord[]
): { exportedAt: string; count: number; designs: DesignRecord[] } {
  return {
    exportedAt: new Date().toISOString(),
    count: designs.length,
    designs,
  };
}

/**
 * Download the given design records as a single JSON file.
 * Payload: { exportedAt: string, count: number, designs: DesignRecord[] }.
 * Filename: project-designs-{YYYY-MM-DD-HHmm}.json
 * If the list is empty, shows a toast and returns.
 */
export function downloadProjectDesignsAsJson(designs: DesignRecord[]): void {
  if (designs.length === 0) {
    toast.info("No designs to export");
    return;
  }

  const payload = buildProjectDesignsJsonPayload(designs);
  const json = JSON.stringify(payload, null, 2);
  const filename = `project-designs-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Designs exported as JSON");
}

/**
 * Copy the given design records as pretty-printed JSON to the clipboard.
 * Same payload as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectDesignsAsJsonToClipboard(
  designs: DesignRecord[]
): Promise<void> {
  if (designs.length === 0) {
    toast.info("No designs to export");
    return;
  }

  const payload = buildProjectDesignsJsonPayload(designs);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Designs copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
