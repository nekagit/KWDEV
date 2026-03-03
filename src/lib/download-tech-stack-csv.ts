/**
 * Export tech stack as CSV. Used by Technologies page and command palette.
 */
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";
import type { TechStackExport } from "@/lib/download-tech-stack";

const CSV_HEADER = "category,technology,description";

function categoryToRows(
  category: string,
  record: Record<string, string> | undefined
): string[] {
  if (!record || Object.keys(record).length === 0) return [];
  return Object.entries(record).map(([tech, desc]) => {
    const cat = escapeCsvField(category);
    const t = escapeCsvField(tech ?? "");
    const d = escapeCsvField(desc ?? "");
    return `${cat},${t},${d}`;
  });
}

/**
 * Build CSV string for tech stack: header + rows (category, technology, description).
 * Categories: Frontend, Backend, Tooling.
 */
export function buildTechStackCsv(data: TechStackExport): string {
  const rows: string[] = [];
  rows.push(...categoryToRows("Frontend", data.frontend));
  rows.push(...categoryToRows("Backend", data.backend));
  rows.push(...categoryToRows("Tooling", data.tooling));
  if (rows.length === 0) return CSV_HEADER + "\n";
  return [CSV_HEADER, ...rows].join("\n");
}

/**
 * Download the current tech stack as a CSV file.
 * Columns: category, technology, description.
 * Filename: tech-stack-{YYYY-MM-DD-HHmm}.csv
 * If data is null/undefined, shows a toast and does nothing.
 */
export function downloadTechStackAsCsv(
  data: TechStackExport | null | undefined
): void {
  if (data == null) {
    toast.info("No tech stack to export");
    return;
  }
  const csv = buildTechStackCsv(data);
  const filename = `tech-stack-${filenameTimestamp()}.csv`;
  triggerFileDownload(csv, filename, "text/csv;charset=utf-8");
  toast.success("Tech stack exported as CSV");
}

/**
 * Copy the current tech stack as CSV to the clipboard.
 * Same columns and format as download. If data is null/undefined, shows a toast and returns false.
 */
export async function copyTechStackAsCsvToClipboard(
  data: TechStackExport | null | undefined
): Promise<boolean> {
  if (data == null) {
    toast.info("No tech stack to copy");
    return false;
  }
  const csv = buildTechStackCsv(data);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Tech stack copied as CSV");
  }
  return ok;
}
