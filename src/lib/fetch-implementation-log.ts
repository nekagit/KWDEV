/**
 * Dual-mode fetch for implementation log entries.
 * Used by ProjectControlTab so the component stays focused on UI; one place for the contract.
 */

import { invoke, isTauri, projectIdArgPayload } from "@/lib/tauri";

export type ImplementationLogEntry = {
  id: number;
  project_id: string;
  run_id: string;
  ticket_number: number;
  ticket_title: string;
  milestone_id?: number;
  idea_id?: number;
  completed_at: string;
  files_changed: { path: string; status: string }[];
  summary: string;
  created_at: string;
  status?: string;
};

type RawRow = {
  id: number;
  project_id: string;
  run_id: string;
  ticket_number: number;
  ticket_title: string;
  milestone_id: number | null;
  idea_id: number | null;
  completed_at: string;
  files_changed: string;
  summary: string;
  created_at: string;
  status: string;
};

function mapRawRowToEntry(r: RawRow): ImplementationLogEntry {
  let filesChanged: { path: string; status: string }[] = [];
  try {
    filesChanged = JSON.parse(r.files_changed || "[]") as { path: string; status: string }[];
  } catch {
    filesChanged = [];
  }
  return {
    id: r.id,
    project_id: r.project_id,
    run_id: r.run_id,
    ticket_number: r.ticket_number,
    ticket_title: r.ticket_title,
    milestone_id: r.milestone_id ?? undefined,
    idea_id: r.idea_id ?? undefined,
    completed_at: r.completed_at,
    files_changed: filesChanged,
    summary: r.summary,
    created_at: r.created_at,
    status: r.status,
  };
}

/**
 * Fetches implementation log entries for a project (newest first).
 * Tauri: invoke get_implementation_log_entries. Browser: GET /api/data/projects/:id/implementation-log.
 * Throws on error; caller handles setError and logging.
 */
export async function fetchImplementationLogEntries(
  projectId: string
): Promise<ImplementationLogEntry[]> {
  if (isTauri) {
    const raw = await invoke<RawRow[]>(
      "get_implementation_log_entries",
      projectIdArgPayload(projectId)
    );
    return (raw ?? []).map(mapRawRowToEntry);
  }
  const res = await fetch(`/api/data/projects/${projectId}/implementation-log`);
  if (!res.ok) throw new Error("Failed to load implementation log");
  const list = (await res.json()) as ImplementationLogEntry[];
  return list ?? [];
}
