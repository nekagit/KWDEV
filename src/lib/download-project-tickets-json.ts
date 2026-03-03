/**
 * Export project tickets as JSON. Used by Tickets tab and command palette.
 */
import { toast } from "sonner";
import type { ParsedTicket } from "@/lib/todos-kanban";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Build the JSON payload for list export. Same shape as download.
 */
export function buildProjectTicketsJsonPayload(tickets: ParsedTicket[]): {
  exportedAt: string;
  count: number;
  tickets: ParsedTicket[];
} {
  return {
    exportedAt: new Date().toISOString(),
    count: tickets.length,
    tickets,
  };
}

/**
 * Download the given project tickets as a single JSON file.
 * Payload: { exportedAt: string, count: number, tickets: ParsedTicket[] }.
 * Filename: project-tickets-{YYYY-MM-DD-HHmm}.json
 * If the list is empty, shows a toast and returns.
 */
export function downloadProjectTicketsAsJson(tickets: ParsedTicket[]): void {
  if (tickets.length === 0) {
    toast.info("No tickets to export");
    return;
  }

  const payload = buildProjectTicketsJsonPayload(tickets);
  const json = JSON.stringify(payload, null, 2);
  const filename = `project-tickets-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Tickets exported as JSON");
}

/**
 * Copy the given project tickets as pretty-printed JSON to the clipboard.
 * Same payload as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectTicketsAsJsonToClipboard(
  tickets: ParsedTicket[]
): Promise<void> {
  if (tickets.length === 0) {
    toast.info("No tickets to export");
    return;
  }

  const payload = buildProjectTicketsJsonPayload(tickets);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Tickets copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
