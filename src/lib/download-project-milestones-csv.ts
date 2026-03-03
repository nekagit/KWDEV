/**
 * Export project milestones as CSV. Used by Milestones tab and command palette.
 */
import { toast } from "sonner";
import type { MilestoneRecord } from "@/types/milestone";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";

/**
 * Build CSV content for the given project milestones.
 * Columns: id, project_id, name, slug, created_at, updated_at.
 * Content is omitted to keep CSV compact; use JSON export for full content.
 */
export function buildProjectMilestonesCsv(
  milestones: MilestoneRecord[]
): string {
  const header =
    "id,project_id,name,slug,created_at,updated_at";
  const rows = milestones.map((m) => {
    const id = String(m.id);
    const projectId = escapeCsvField(m.project_id ?? "");
    const name = escapeCsvField(m.name ?? "");
    const slug = escapeCsvField(m.slug ?? "");
    const createdAt = escapeCsvField(m.created_at ?? "");
    const updatedAt = escapeCsvField(m.updated_at ?? "");
    return `${id},${projectId},${name},${slug},${createdAt},${updatedAt}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Download the given project milestones as a CSV file.
 * Filename: project-milestones-{YYYY-MM-DD-HHmm}.csv
 * If the list is empty, shows a toast and does nothing.
 */
export function downloadProjectMilestonesAsCsv(
  milestones: MilestoneRecord[]
): void {
  if (milestones.length === 0) {
    toast.info("No milestones to export");
    return;
  }

  const csv = buildProjectMilestonesCsv(milestones);
  const filename = `project-milestones-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Milestones exported as CSV");
}

/**
 * Copy the given project milestones as CSV to the clipboard.
 * Same columns and format as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectMilestonesAsCsvToClipboard(
  milestones: MilestoneRecord[]
): Promise<void> {
  if (milestones.length === 0) {
    toast.info("No milestones to export");
    return;
  }

  const csv = buildProjectMilestonesCsv(milestones);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Milestones copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
