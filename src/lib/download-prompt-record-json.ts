/**
 * Download a single prompt record as JSON. Used by Prompts tab and command palette.
 */
import { toast } from "sonner";
import {
  safeFilenameSegment,
  filenameTimestamp,
  downloadBlob,
} from "@/lib/download-helpers";

/**
 * Payload for exporting a prompt record as JSON.
 * At minimum id, title, content; optional fields for full record export.
 */
export interface PromptRecordJsonPayload {
  id: number;
  title: string;
  content: string;
  description?: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Download a prompt record as a JSON file.
 * Filename: prompt-{title}-{YYYY-MM-DD-HHmm}.json
 * Includes all provided fields (id, title, content, and any optional fields).
 */
export function downloadPromptRecordAsJson(record: PromptRecordJsonPayload): void {
  const segment = safeFilenameSegment(record.title, "prompt");
  const filename = `prompt-${segment}-${filenameTimestamp()}.json`;
  const json = JSON.stringify(record, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Prompt exported as JSON");
}
