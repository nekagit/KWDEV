/**
 * Export project milestones as JSON. Used by Milestones tab and command palette.
 */
import { toast } from "sonner";
import type { MilestoneRecord } from "@/types/milestone";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build the JSON payload for list export. Same shape as download.
 */
export function buildProjectMilestonesJsonPayload(milestones: MilestoneRecord[]): {
  exportedAt: string;
  count: number;
  milestones: MilestoneRecord[];
} {
  return {
    exportedAt: new Date().toISOString(),
    count: milestones.length,
    milestones,
  };
}

/**
 * Download the given project milestones as a single JSON file.
 * Payload: { exportedAt: string, count: number, milestones: MilestoneRecord[] }.
 * Filename: project-milestones-{YYYY-MM-DD-HHmm}.json
 * If the list is empty, shows a toast and returns.
 */
export function downloadProjectMilestonesAsJson(
  milestones: MilestoneRecord[]
): void {
  if (milestones.length === 0) {
    toast.info("No milestones to export");
    return;
  }

  const payload = buildProjectMilestonesJsonPayload(milestones);
  const json = JSON.stringify(payload, null, 2);
  const filename = `project-milestones-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Milestones exported as JSON");
}

/**
 * Copy the given project milestones as pretty-printed JSON to the clipboard.
 * Same payload as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectMilestonesAsJsonToClipboard(
  milestones: MilestoneRecord[]
): Promise<void> {
  if (milestones.length === 0) {
    toast.info("No milestones to export");
    return;
  }

  const payload = buildProjectMilestonesJsonPayload(milestones);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Milestones copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
