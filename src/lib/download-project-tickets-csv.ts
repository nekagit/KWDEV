/**
 * Export project tickets as CSV. Used by Tickets tab and command palette.
 */
import { toast } from "sonner";
import type { ParsedTicket } from "@/lib/todos-kanban";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";

/**
 * Build CSV content for the given project tickets.
 * Columns: id, number, title, description, priority, feature_name, status, done.
 */
export function buildProjectTicketsCsv(tickets: ParsedTicket[]): string {
  const header = "id,number,title,description,priority,feature_name,status,done";
  const rows = tickets.map((t) => {
    const id = escapeCsvField(t.id);
    const number = String(t.number);
    const title = escapeCsvField(t.title ?? "");
    const description = escapeCsvField(t.description ?? "");
    const priority = escapeCsvField(t.priority ?? "");
    const featureName = escapeCsvField(t.featureName ?? "General");
    const status = escapeCsvField(t.status ?? (t.done ? "Done" : "Todo"));
    const done = t.done ? "1" : "0";
    return `${id},${number},${title},${description},${priority},${featureName},${status},${done}`;
  });
  return [header, ...rows].join("\n");
}

/**
 * Download the given project tickets as a CSV file.
 * Columns: id, number, title, description, priority, feature_name, status, done.
 * Filename: project-tickets-{YYYY-MM-DD-HHmm}.csv
 * If the list is empty, shows a toast and does nothing.
 */
export function downloadProjectTicketsAsCsv(tickets: ParsedTicket[]): void {
  if (tickets.length === 0) {
    toast.info("No tickets to export");
    return;
  }

  const csv = buildProjectTicketsCsv(tickets);
  const filename = `project-tickets-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Tickets exported as CSV");
}

/**
 * Copy the given project tickets as CSV to the clipboard.
 * Same columns and format as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectTicketsAsCsvToClipboard(
  tickets: ParsedTicket[]
): Promise<void> {
  if (tickets.length === 0) {
    toast.info("No tickets to export");
    return;
  }

  const csv = buildProjectTicketsCsv(tickets);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Tickets copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
