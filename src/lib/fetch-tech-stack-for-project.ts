/**
 * Fetch tech stack for a given project path (that project's .cursor/technologies/tech-stack.json).
 * Used by command palette "Download/Copy first project tech stack" actions.
 * Tauri-only: in browser mode shows a toast and returns null.
 */

import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";
import type { TechStackExport } from "@/lib/download-tech-stack";

const TECH_STACK_RELATIVE_PATH = ".cursor/technologies/tech-stack.json";

function parseTechStack(raw: string | undefined): TechStackExport | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const data = JSON.parse(raw) as TechStackExport;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/**
 * Returns the tech stack for the given project path (reads that project's
 * .cursor/technologies/tech-stack.json). Tauri only; in browser returns null
 * and shows a toast. On read/parse failure shows a toast and returns null.
 */
export async function fetchTechStackForProject(
  projectPath: string
): Promise<TechStackExport | null> {
  if (!isTauri) {
    toast.info("First project tech stack export is available in the desktop app");
    return null;
  }
  const trimmed = projectPath?.trim();
  if (!trimmed) {
    toast.info("Select a project first");
    return null;
  }
  try {
    const content = await invoke<string>("read_file_text_under_root", {
      root: trimmed,
      path: TECH_STACK_RELATIVE_PATH,
    });
    return parseTechStack(content ?? undefined);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load project tech stack";
    toast.error(message);
    return null;
  }
}
