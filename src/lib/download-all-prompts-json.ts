/**
 * Export all prompts (DB) as JSON. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface PromptRecordForExport {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Build JSON payload for general prompts (same shape as download).
 */
export function buildAllPromptsJsonPayload(prompts: PromptRecordForExport[]): {
  exportedAt: string;
  prompts: PromptRecordForExport[];
} {
  return {
    exportedAt: new Date().toISOString(),
    prompts,
  };
}

/**
 * Download all general prompt records as a single JSON file.
 * Payload: { exportedAt: string, prompts: PromptRecordForExport[] }.
 * Filename: all-prompts-{YYYY-MM-DD-HHmm}.json
 */
export function downloadAllPromptsAsJson(prompts: PromptRecordForExport[]): void {
  if (prompts.length === 0) {
    toast.info("No prompts to export");
    return;
  }

  const payload = buildAllPromptsJsonPayload(prompts);
  const json = JSON.stringify(payload, null, 2);
  const filename = `all-prompts-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Prompts exported as JSON");
}

/**
 * Copy all general prompt records to the clipboard as pretty-printed JSON.
 * Same payload as downloadAllPromptsAsJson.
 */
export async function copyAllPromptsAsJsonToClipboard(
  prompts: PromptRecordForExport[]
): Promise<boolean> {
  if (prompts.length === 0) {
    toast.info("No prompts to export");
    return false;
  }
  const payload = buildAllPromptsJsonPayload(prompts);
  const json = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(json);
  if (ok) {
    toast.success("Prompts copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
