/**
 * Export all Cursor prompts as CSV. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { escapeCsvField } from "@/lib/csv-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface CursorPromptFileWithContent {
  relativePath: string;
  path: string;
  name: string;
  content: string;
  updatedAt: string;
}

/**
 * Build CSV content for the given .cursor prompt files.
 * Columns: relativePath, path, name, updatedAt, content.
 */
function cursorPromptsToCsv(files: CursorPromptFileWithContent[]): string {
  const header = "relativePath,path,name,updatedAt,content";
  const rows = files.map((f) => {
    const relativePath = escapeCsvField(String(f.relativePath ?? "").trim());
    const path = escapeCsvField(String(f.path ?? "").trim());
    const name = escapeCsvField(String(f.name ?? "").trim() || "Untitled");
    const updatedAt = escapeCsvField(String(f.updatedAt ?? ""));
    const content = escapeCsvField(String(f.content ?? "").trim());
    return `${relativePath},${path},${name},${updatedAt},${content}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Fetch .cursor prompt files from API (same as download).
 */
async function fetchCursorPromptFiles(): Promise<CursorPromptFileWithContent[]> {
  const res = await fetch("/api/data/cursor-prompt-files-contents");
  if (!res.ok) throw new Error("Failed to load .cursor prompts");
  const data = (await res.json()) as { files?: CursorPromptFileWithContent[] };
  return Array.isArray(data.files) ? data.files : [];
}

/**
 * Download all .cursor *.prompt.md files as a single CSV file.
 * Fetches content from /api/data/cursor-prompt-files-contents.
 * Filename: all-cursor-prompts-{YYYY-MM-DD-HHmm}.csv
 */
export async function downloadAllCursorPromptsAsCsv(): Promise<void> {
  try {
    const files = await fetchCursorPromptFiles();
    if (files.length === 0) {
      toast.info("No .cursor prompts to export");
      return;
    }

    const csv = cursorPromptsToCsv(files);
    const filename = `all-cursor-prompts-${filenameTimestamp()}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, filename);
    toast.success(".cursor prompts exported as CSV");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Export failed");
  }
}

/**
 * Copy all .cursor prompt files to the clipboard as CSV.
 * Same columns as downloadAllCursorPromptsAsCsv. Fetches from same API.
 */
export async function copyAllCursorPromptsAsCsvToClipboard(): Promise<boolean> {
  try {
    const res = await fetch("/api/data/cursor-prompt-files-contents");
    if (!res.ok) throw new Error("Failed to load .cursor prompts");
    const data = (await res.json()) as { files?: CursorPromptFileWithContent[] };
    const files = Array.isArray(data.files) ? data.files : [];
    if (files.length === 0) {
      toast.info("No .cursor prompts to export");
      return false;
    }
    const csv = cursorPromptsToCsv(files);
    const ok = await copyTextToClipboard(csv);
    if (ok) {
      toast.success(".cursor prompts copied as CSV");
    } else {
      toast.error("Failed to copy to clipboard");
    }
    return ok;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Copy failed");
    return false;
  }
}
