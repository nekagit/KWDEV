/**
 * Export projects list as CSV. Used by command palette and Projects page.
 */
import { toast } from "sonner";
import type { Project } from "@/types/project";
import { filenameTimestamp, downloadBlob } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { escapeCsvField } from "@/lib/csv-helpers";

const CSV_HEADER =
  "id,name,description,repo_path,run_port,created_at,updated_at,prompt_count,ticket_count,idea_count,design_count,architecture_count";

function buildProjectsListCsv(projects: Project[]): string {
  const rows = projects.map((p) => {
    const id = escapeCsvField(p.id);
    const name = escapeCsvField(p.name ?? "");
    const description = escapeCsvField(p.description ?? "");
    const repoPath = escapeCsvField(p.repoPath ?? "");
    const runPort = p.runPort != null ? String(p.runPort) : "";
    const createdAt = escapeCsvField(p.created_at ?? "");
    const updatedAt = escapeCsvField(p.updated_at ?? "");
    const promptCount = String(Array.isArray(p.promptIds) ? p.promptIds.length : 0);
    const ticketCount = String(Array.isArray(p.ticketIds) ? p.ticketIds.length : 0);
    const ideaCount = String(Array.isArray(p.ideaIds) ? p.ideaIds.length : 0);
    const designCount = String(Array.isArray(p.designIds) ? p.designIds.length : 0);
    const architectureCount = String(Array.isArray(p.architectureIds) ? p.architectureIds.length : 0);
    return `${id},${name},${description},${repoPath},${runPort},${createdAt},${updatedAt},${promptCount},${ticketCount},${ideaCount},${designCount},${architectureCount}`;
  });
  return [CSV_HEADER, ...rows].join("\n");
}

/**
 * Download the given projects list as a CSV file.
 * Columns: id, name, description, repo_path, run_port, created_at, updated_at, prompt_count, ticket_count, idea_count, design_count, architecture_count.
 * Filename: projects-list-{YYYY-MM-DD-HHmm}.csv
 * If the list is empty, shows a toast and does nothing.
 */
export function downloadProjectsListAsCsv(projects: Project[]): void {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return;
  }

  const csv = buildProjectsListCsv(projects);
  const filename = `projects-list-${filenameTimestamp()}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  toast.success("Projects list exported as CSV");
}

/**
 * Copy the given projects list as CSV to the clipboard.
 * Same columns and format as download. If the list is empty, shows a toast and returns.
 */
export async function copyProjectsListAsCsvToClipboard(
  projects: Project[]
): Promise<void> {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return;
  }

  const csv = buildProjectsListCsv(projects);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Projects list copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
