/**
 * Compare project .cursor folder with init template to detect missing files.
 * Used to show an exclamation icon next to the project title when .cursor is incomplete.
 */

import { invoke, isTauri } from "@/lib/tauri";
import { listProjectFiles } from "@/lib/api-projects";

const CURSOR_PREFIX = ".cursor/";
const MAX_CURSOR_FILES = 2000;

/** Returns relative paths under the init template (e.g. "prompts/night-shift.prompt.md" or "data/prompts/night-shift.prompt.md"). */
export async function getInitTemplatePaths(): Promise<Set<string>> {
  if (isTauri) {
    const map = (await invoke("get_cursor_init_template")) as Record<string, string>;
    return new Set(Object.keys(map).map(normalizePath));
  }
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${base}/api/data/cursor-init-template`);
  if (!res.ok) return new Set();
  const json = (await res.json()) as { files?: Record<string, string> };
  const files = json.files ?? {};
  return new Set(Object.keys(files).map(normalizePath));
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").trim();
}

/** Strip optional "N. " prefix from path segments and leading ".cursor/" so paths match across template vs project. */
function pathForComparison(p: string): string {
  let normalized = normalizePath(p);
  if (normalized.startsWith(".cursor/")) normalized = normalized.slice(".cursor/".length);
  const segments = normalized.split("/").map((seg) => seg.replace(/^\d+\.\s*/, "").trim());
  return segments.filter(Boolean).join("/");
}

/** Trim trailing slashes so prefix matches paths from Rust (e.g. repoPath/ + ".cursor/" vs repoPath/.cursor/). */
function trimTrailingSlash(p: string): string {
  return p.replace(/\/+$/, "");
}

/**
 * Returns relative paths of files under project's .cursor or data (e.g. "prompts/night-shift.prompt.md" or "data/prompts/night-shift.prompt.md").
 * Tauri: uses list_cursor_folder; browser: walks .cursor via listProjectFiles.
 */
export async function getProjectCursorRelativePaths(
  projectId: string,
  repoPath?: string
): Promise<Set<string>> {
  const out = new Set<string>();

  if (isTauri && repoPath) {
    try {
      const entries = (await invoke("list_cursor_folder", { projectPath: repoPath })) as Array<{ path: string }>;
      const prefix = trimTrailingSlash(normalizePath(repoPath)) + "/" + CURSOR_PREFIX;
      for (const e of entries) {
        const full = normalizePath(e.path);
        if (full.startsWith(prefix)) {
          const rel = full.slice(prefix.length);
          if (rel) out.add(rel);
        }
      }
      return out;
    } catch {
      return out;
    }
  }

  async function walk(relativePath: string): Promise<void> {
    if (out.size >= MAX_CURSOR_FILES) return;
    try {
      const entries = await listProjectFiles(projectId, relativePath, repoPath);
      for (const e of entries) {
        const full = relativePath ? `${relativePath}/${e.name}` : e.name;
        if (e.isDirectory) {
          await walk(full);
        } else {
          out.add(normalizePath(full));
        }
        if (out.size >= MAX_CURSOR_FILES) return;
      }
    } catch {
      // ignore listing errors
    }
  }

  await walk(CURSOR_PREFIX.replace(/\/$/, ""));
  const relativeOnly = new Set<string>();
  for (const p of out) {
    if (p.startsWith(CURSOR_PREFIX)) {
      relativeOnly.add(p.slice(CURSOR_PREFIX.length));
    } else {
      relativeOnly.add(p);
    }
  }
  return relativeOnly;
}

/**
 * True if the init template has at least one file and the project's .cursor is missing at least one of them.
 * Compares using pathForComparison so "1. project/foo" in the project matches template "project/foo".
 */
export async function hasMissingCursorInitFiles(
  projectId: string,
  repoPath?: string
): Promise<boolean> {
  const [templatePaths, projectPaths] = await Promise.all([
    getInitTemplatePaths(),
    getProjectCursorRelativePaths(projectId, repoPath),
  ]);
  if (templatePaths.size === 0) return false;
  const projectPathsByComparison = new Set<string>();
  for (const p of projectPaths) {
    projectPathsByComparison.add(pathForComparison(p));
  }
  for (const p of templatePaths) {
    const key = pathForComparison(p);
    if (!projectPathsByComparison.has(key)) return true;
  }
  return false;
}
