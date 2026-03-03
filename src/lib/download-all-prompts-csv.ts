/**
 * Export all prompts (DB) as CSV. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { escapeCsvField } from "@/lib/csv-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface PromptRecordForExport {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Build CSV content for the given prompts.
 * Columns: id, title, content, category, created_at, updated_at.
 */
export function promptsToCsv(prompts: PromptRecordForExport[]): string {
  const header = "id,title,content,category,created_at,updated_at";
  const rows = prompts.map((p) => {
    const id = String(p.id ?? "");
    const title = escapeCsvField((p.title ?? "").trim() || "Untitled");
    const content = escapeCsvField((p.content ?? "").trim());
    const category = escapeCsvField(String(p.category ?? ""));
    const created_at = escapeCsvField(p.created_at ?? "");
    const updated_at = escapeCsvField(p.updated_at ?? "");
    return `${id},${title},${content},${category},${created_at},${updated_at}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Download all general prompt records as a single CSV file.
 * Filename: all-prompts-{YYYY-MM-DD-HHmm}.csv
 */
export function downloadAllPromptsAsCsv(prompts: PromptRecordForExport[]): void {
  if (prompts.length === 0) {
    toast.info("No prompts to export");
    return;
  }

  const csv = promptsToCsv(prompts);
  const filename = `all-prompts-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Prompts exported as CSV");
}

/**
 * Copy all general prompt records to the clipboard as CSV.
 * Same columns as downloadAllPromptsAsCsv.
 */
export async function copyAllPromptsAsCsvToClipboard(
  prompts: PromptRecordForExport[]
): Promise<boolean> {
  if (prompts.length === 0) {
    toast.info("No prompts to export");
    return false;
  }
  const csv = promptsToCsv(prompts);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Prompts copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
