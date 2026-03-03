/**
 * Export the currently selected (active) project paths as JSON or CSV.
 * Used by command palette "Copy/Download active projects as JSON" and "Copy/Download active projects as CSV".
 */

import { toast } from "sonner";
import type { Project } from "@/types/project";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { escapeCsvField } from "@/lib/csv-helpers";

export interface ActiveProjectsPayload {
  exportedAt: string;
  count: number;
  paths: string[];
  /** Resolved path + name for each path (when project list is provided). */
  projects?: { path: string; name?: string }[];
}

/**
 * Build JSON payload for the active project set.
 * If projects list is provided, enriches with names matched by repoPath.
 */
export function buildActiveProjectsPayload(
  paths: string[],
  projects?: Project[] | null
): ActiveProjectsPayload {
  const projectsMap = new Map<string, string>();
  if (projects?.length) {
    for (const p of projects) {
      if (p.repoPath) projectsMap.set(p.repoPath, p.name ?? "");
    }
  }
  const enriched =
    projectsMap.size > 0
      ? paths.map((path) => ({
          path,
          name: projectsMap.get(path) ?? undefined,
        }))
      : undefined;

  return {
    exportedAt: new Date().toISOString(),
    count: paths.length,
    paths,
    ...(enriched && { projects: enriched }),
  };
}

/**
 * Copy the active projects payload as pretty-printed JSON to the clipboard.
 * If paths is empty, shows a toast and returns.
 */
export async function copyActiveProjectsAsJsonToClipboard(
  paths: string[],
  projects?: Project[] | null
): Promise<void> {
  if (paths.length === 0) {
    toast.info("No active projects to export");
    return;
  }
  const payload = buildActiveProjectsPayload(paths, projects);
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("Active projects copied as JSON");
  }
}

/**
 * Download the active projects payload as a JSON file.
 * Filename: active-projects-{YYYY-MM-DD-HHmm}.json
 * If paths is empty, shows a toast and returns.
 */
export function downloadActiveProjectsAsJson(
  paths: string[],
  projects?: Project[] | null
): void {
  if (paths.length === 0) {
    toast.info("No active projects to export");
    return;
  }
  const payload = buildActiveProjectsPayload(paths, projects);
  const content = JSON.stringify(payload, null, 2);
  const filename = `active-projects-${filenameTimestamp()}.json`;
  triggerFileDownload(content, filename, "application/json;charset=utf-8");
  toast.success("Active projects exported as JSON");
}

const CSV_HEADER = "path,name";

/**
 * Build CSV string for active projects: header + one row per project (path, name).
 * Uses payload.projects when present (path + name); otherwise payload.paths with empty name.
 */
export function buildActiveProjectsCsv(payload: ActiveProjectsPayload): string {
  const rows: string[] = [];
  if (payload.projects?.length) {
    for (const p of payload.projects) {
      rows.push(`${escapeCsvField(p.path)},${escapeCsvField(p.name ?? "")}`);
    }
  } else {
    for (const path of payload.paths) {
      rows.push(`${escapeCsvField(path)},`);
    }
  }
  if (rows.length === 0) return CSV_HEADER + "\n";
  return [CSV_HEADER, ...rows].join("\n");
}

/**
 * Copy the active projects as CSV to the clipboard.
 * If paths is empty, shows a toast and returns.
 */
export async function copyActiveProjectsAsCsvToClipboard(
  paths: string[],
  projects?: Project[] | null
): Promise<void> {
  if (paths.length === 0) {
    toast.info("No active projects to export");
    return;
  }
  const payload = buildActiveProjectsPayload(paths, projects);
  const csv = buildActiveProjectsCsv(payload);
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Active projects copied as CSV");
  }
}

/**
 * Download the active projects as a CSV file.
 * Filename: active-projects-{YYYY-MM-DD-HHmm}.csv
 * If paths is empty, shows a toast and returns.
 */
export function downloadActiveProjectsAsCsv(
  paths: string[],
  projects?: Project[] | null
): void {
  if (paths.length === 0) {
    toast.info("No active projects to export");
    return;
  }
  const payload = buildActiveProjectsPayload(paths, projects);
  const csv = buildActiveProjectsCsv(payload);
  const filename = `active-projects-${filenameTimestamp()}.csv`;
  triggerFileDownload(csv, filename, "text/csv;charset=utf-8");
  toast.success("Active projects exported as CSV");
}
