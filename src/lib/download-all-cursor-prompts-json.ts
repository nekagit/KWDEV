/**
 * Export all Cursor prompts as JSON. Used by command palette and export toolbar.
 */
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface CursorPromptFileWithContent {
  relativePath: string;
  path: string;
  name: string;
  content: string;
  updatedAt: string;
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
 * Download all .cursor *.prompt.md files as a single JSON file.
 * Fetches content from /api/data/cursor-prompt-files-contents.
 * Payload: { exportedAt: string, files: CursorPromptFileWithContent[] }.
 * Filename: all-cursor-prompts-{YYYY-MM-DD-HHmm}.json
 */
export async function downloadAllCursorPromptsAsJson(): Promise<void> {
  try {
    const files = await fetchCursorPromptFiles();
    if (files.length === 0) {
      toast.info("No .cursor prompts to export");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      files,
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `all-cursor-prompts-${filenameTimestamp()}.json`;
    triggerFileDownload(json, filename, "application/json;charset=utf-8");
    toast.success(".cursor prompts exported as JSON");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Export failed");
  }
}

/**
 * Copy all .cursor prompt files to the clipboard as pretty-printed JSON.
 * Same payload as downloadAllCursorPromptsAsJson. Fetches from same API.
 */
export async function copyAllCursorPromptsAsJsonToClipboard(): Promise<boolean> {
  try {
    const res = await fetch("/api/data/cursor-prompt-files-contents");
    if (!res.ok) throw new Error("Failed to load .cursor prompts");
    const data = (await res.json()) as { files?: CursorPromptFileWithContent[] };
    const files = Array.isArray(data.files) ? data.files : [];
    if (files.length === 0) {
      toast.info("No .cursor prompts to export");
      return false;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      files,
    };
    const json = JSON.stringify(payload, null, 2);
    const ok = await copyTextToClipboard(json);
    if (ok) {
      toast.success(".cursor prompts copied as JSON");
    } else {
      toast.error("Failed to copy to clipboard");
    }
    return ok;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Copy failed");
    return false;
  }
}
