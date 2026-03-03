/**
 * Export project architectures as JSON. Used by project Architecture tab and command palette.
 */
import { toast } from "sonner";
import type { ArchitectureRecord } from "@/types/architecture";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build the JSON payload for list export. Same shape as download.
 */
export function buildProjectArchitecturesJsonPayload(
  architectures: ArchitectureRecord[]
): { exportedAt: string; count: number; architectures: ArchitectureRecord[] } {
  return {
    exportedAt: new Date().toISOString(),
    count: architectures.length,
    architectures,
  };
}

/**
 * Download the given architecture records as a single JSON file.
 * Payload: { exportedAt: string, count: number, architectures: ArchitectureRecord[] }.
 * Filename: project-architectures-{YYYY-MM-DD-HHmm}.json
 * If the list is empty, shows a toast and returns.
 */
export function downloadProjectArchitecturesAsJson(
  architectures: ArchitectureRecord[]
): void {
  if (architectures.length === 0) {
    toast.info("No architectures to export");
    return;
  }

  const payload = buildProjectArchitecturesJsonPayload(architectures);
  const json = JSON.stringify(payload, null, 2);
  const filename = `project-architectures-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Architectures exported as JSON");
}

/**
 * Copy the given architecture records as pretty-printed JSON to the clipboard.
 * Same payload as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectArchitecturesAsJsonToClipboard(
  architectures: ArchitectureRecord[]
): Promise<void> {
  if (architectures.length === 0) {
    toast.info("No architectures to export");
    return;
  }

  const payload = buildProjectArchitecturesJsonPayload(architectures);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Architectures copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
