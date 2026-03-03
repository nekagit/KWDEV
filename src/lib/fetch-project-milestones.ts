/**
 * Dual-mode fetch for project milestones.
 * Tauri: invoke get_project_milestones. Browser: GET /api/data/projects/:id/milestones.
 */

import { invoke, isTauri, projectIdArgPayload } from "@/lib/tauri";
import type { MilestoneRecord } from "@/types/milestone";

/** Raw shape from Tauri (serde_json from db). */
type RawMilestone = {
  id: number;
  project_id: string;
  name: string;
  slug: string;
  content?: string | null;
  created_at?: string;
  updated_at?: string;
};

function mapRawToMilestone(r: RawMilestone): MilestoneRecord {
  return {
    id: r.id,
    project_id: r.project_id,
    name: r.name,
    slug: r.slug,
    content: r.content ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Fetches milestones for a project (ordered by name; "General Development" ensured by backend).
 * Tauri: invoke get_project_milestones. Browser: GET /api/data/projects/:id/milestones.
 * Throws on error; caller handles toast/error state.
 */
export async function fetchProjectMilestones(
  projectId: string
): Promise<MilestoneRecord[]> {
  if (isTauri) {
    const raw = await invoke<RawMilestone[]>(
      "get_project_milestones",
      projectIdArgPayload(projectId)
    );
    return (raw ?? []).map(mapRawToMilestone);
  }
  const res = await fetch(`/api/data/projects/${projectId}/milestones`);
  if (!res.ok) throw new Error("Failed to load milestones");
  const list = (await res.json()) as MilestoneRecord[];
  return list ?? [];
}
