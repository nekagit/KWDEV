/**
 * Download run terminal output as a plain text file. Used by Run tab and command palette.
 */
import {
  safeFilenameSegment,
  filenameTimestamp,
  downloadBlob,
} from "@/lib/download-helpers";

/**
 * Download run output as a plain-text file.
 * Filename: run-{label}-{YYYY-MM-DD-HHmm}.txt
 */
export function downloadRunOutput(output: string, label: string): void {
  const segment = safeFilenameSegment(label, "run");
  const filename = `run-${segment}-${filenameTimestamp()}.txt`;
  const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}
