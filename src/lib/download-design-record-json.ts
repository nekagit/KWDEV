/**
 * Download a single design record as JSON. Used by project Design tab and command palette.
 */
import { toast } from "sonner";
import type { DesignRecord } from "@/types/design";
import {
  safeNameForFile,
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

/**
 * Download a design record as a JSON file.
 * Filename: design-{name}-{YYYY-MM-DD-HHmm}.json
 * Includes full record (id, name, description, config, created_at, updated_at, etc.).
 */
export function downloadDesignRecordAsJson(record: DesignRecord): void {
  const segment = safeNameForFile(record.name, "design");
  const filename = `design-${segment}-${filenameTimestamp()}.json`;

  const json = JSON.stringify(record, null, 2);
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Design exported as JSON");
}
