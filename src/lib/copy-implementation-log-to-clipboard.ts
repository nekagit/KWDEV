/**
 * Copy a project's implementation log to the clipboard as plain text.
 * Used by the command palette action "Copy first project implementation log".
 */

import { toast } from "sonner";
import {
  fetchImplementationLogEntries,
  type ImplementationLogEntry,
} from "@/lib/fetch-implementation-log";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

function formatEntry(entry: {
  ticket_number: number;
  ticket_title: string;
  completed_at: string;
  summary: string;
  files_changed: { path: string; status: string }[];
}): string {
  const lines: string[] = [
    `#${entry.ticket_number} ${entry.ticket_title}`,
    `Completed: ${entry.completed_at}`,
    entry.summary?.trim() || "(no summary)",
  ];
  if (entry.files_changed?.length) {
    lines.push("Files: " + entry.files_changed.map((f) => `${f.path} (${f.status})`).join(", "));
  }
  return lines.join("\n");
}

/**
 * Formats implementation log entries as plain text (one block per entry, separated by ---).
 * Shared by copy and download so format stays consistent.
 */
export function formatImplementationLogAsText(
  entries: ImplementationLogEntry[]
): string {
  return entries.map(formatEntry).join("\n\n---\n\n");
}

/**
 * Fetches implementation log entries for the given project, formats them as
 * plain text (newest first), and copies to the clipboard.
 * Shows toast on empty log or on copy success/failure.
 * Returns true if copy succeeded, false otherwise.
 */
export async function copyImplementationLogToClipboard(
  projectId: string
): Promise<boolean> {
  try {
    const entries = await fetchImplementationLogEntries(projectId);
    if (entries.length === 0) {
      toast.info("No implementation log entries");
      return false;
    }
    const text = formatImplementationLogAsText(entries);
    return copyTextToClipboard(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load implementation log";
    toast.error(message);
    return false;
  }
}
