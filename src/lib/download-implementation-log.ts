/**
 * Download a project's implementation log as a timestamped file.
 * Used by the command palette action "Download first project implementation log".
 */

import { toast } from "sonner";
import { fetchImplementationLogEntries } from "@/lib/fetch-implementation-log";
import { formatImplementationLogAsText } from "@/lib/copy-implementation-log-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

/**
 * Fetches implementation log entries for the given project, formats them as
 * plain text, and triggers a file download (implementation-log-YYYY-MM-DD-HHmm.md).
 * Shows toast on empty log or on success/failure.
 */
export async function downloadImplementationLog(
  projectId: string
): Promise<void> {
  try {
    const entries = await fetchImplementationLogEntries(projectId);
    if (entries.length === 0) {
      toast.info("No implementation log entries");
      return;
    }
    const text = formatImplementationLogAsText(entries);
    const filename = `implementation-log-${filenameTimestamp()}.md`;
    triggerFileDownload(text, filename, "text/markdown");
    toast.success("Implementation log downloaded");
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load implementation log";
    toast.error(message);
  }
}
