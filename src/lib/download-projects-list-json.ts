/**
 * Export projects list as JSON. Used by command palette and Projects page.
 */
import { toast } from "sonner";
import type { Project } from "@/types/project";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

function buildProjectsListPayload(projects: Project[]) {
  return {
    exportedAt: new Date().toISOString(),
    count: projects.length,
    projects,
  };
}

/**
 * Download the given projects list as a single JSON file.
 * Payload: { exportedAt: string, count: number, projects: Project[] }.
 * Filename: projects-list-{YYYY-MM-DD-HHmm}.json
 * If the list is empty, shows a toast and returns.
 */
export function downloadProjectsListAsJson(projects: Project[]): void {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return;
  }

  const payload = buildProjectsListPayload(projects);
  const json = JSON.stringify(payload, null, 2);
  const filename = `projects-list-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Projects list exported as JSON");
}

/**
 * Copy the given projects list as pretty-printed JSON to the clipboard.
 * Same payload as download: { exportedAt, count, projects }.
 * If the list is empty, shows a toast and returns.
 */
export async function copyProjectsListAsJsonToClipboard(
  projects: Project[]
): Promise<void> {
  if (projects.length === 0) {
    toast.info("No projects to export");
    return;
  }

  const payload = buildProjectsListPayload(projects);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Projects list copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
