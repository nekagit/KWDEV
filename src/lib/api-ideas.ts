/**
 * Ideas list API: Tauri invoke when in Tauri, else fetch. If invoke is not available yet, falls back to fetch.
 */
import { invoke, isTauri, projectIdArgOptionalPayload } from "@/lib/tauri";
import type { IdeaRecord } from "@/types/idea";

export type IdeaListItem = IdeaRecord | { id: number; title: string };

async function fetchIdeasListViaApi(projectId: string | null): Promise<IdeaListItem[]> {
  const url =
    projectId != null && projectId !== ""
      ? `/api/data/ideas?project_id=${encodeURIComponent(projectId)}`
      : "/api/data/ideas";
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get ideas list (project-scoped or all). Uses Tauri invoke when available; falls back to fetch when invoke is not ready.
 */
export async function getIdeasList(projectId: string | null): Promise<IdeaListItem[]> {
  if (isTauri) {
    try {
      const rows = await invoke<IdeaListItem[]>("get_ideas_list", projectIdArgOptionalPayload(projectId));
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        return fetchIdeasListViaApi(projectId);
      }
      throw err;
    }
  }
  return fetchIdeasListViaApi(projectId);
}
