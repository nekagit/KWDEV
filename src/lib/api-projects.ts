/**
 * Projects API: uses Tauri invoke when running in Tauri (no Next server),
 * otherwise fetch to /api/data/projects. Fixes 404 when app is loaded as static export (e.g. Tauri production).
 */
import { debugIngest } from "@/lib/debug-ingest";
import { invoke, isTauri } from "@/lib/tauri";
import type { Project } from "@/types/project";
import type { RunMeta } from "@/types/run";
import { ANALYZE_JOB_IDS, ANALYZE_QUEUE_PATH, getPromptPath, getOutputPath } from "@/lib/cursor-paths";

export type CreateProjectBody = {
  name: string;
  description?: string;
  repoPath?: string;
  runPort?: number;
  promptIds?: number[];
  ticketIds?: string[];
  ideaIds?: number[];
  designIds?: string[];
  architectureIds?: string[];
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Tauri: invoke(cmd, args). Browser: fetchJson(url, init). Use for CRUD endpoints that map 1:1. If invoke is not available yet (e.g. Tauri bridge not ready), falls back to fetch. */
async function tauriOrFetch<T>(
  tauriCmd: string,
  tauriArgs: Record<string, unknown>,
  fetchUrl: string,
  fetchInit?: RequestInit
): Promise<T> {
  if (isTauri) {
    try {
      return await invoke<T>(tauriCmd, tauriArgs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        return fetchJson<T>(fetchUrl, fetchInit);
      }
      throw err;
    }
  }
  return fetchJson<T>(fetchUrl, fetchInit);
}

export type ResolvedProject = Project & {
  prompts: unknown[];
  tickets: unknown[];
  ideas: unknown[];
  designs: unknown[];
  architectures: unknown[];
};

/** Get one project with resolved prompts, tickets, ideas, designs, architectures. In Tauri uses same sources as dashboard (SQLite + JSON) so counts match "All data". */
export async function getProjectResolved(id: string): Promise<ResolvedProject> {
  return tauriOrFetch<ResolvedProject>("get_project_resolved", { id }, `/api/data/projects/${id}?resolve=1`);
}

export async function listProjects(): Promise<Project[]> {
  return tauriOrFetch<Project[]>("list_projects", {}, "/api/data/projects");
}

export async function createProject(body: CreateProjectBody): Promise<Project> {
  if (isTauri) {
    // #region agent log
    debugIngest({
      location: "api-projects.ts:createProject",
      message: "createProject invoking create_project",
      data: { name: body.name },
      timestamp: Date.now(),
      hypothesisId: "A",
    });
    // #endregion
  }
  return tauriOrFetch<Project>("create_project", { project: body }, "/api/data/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateProject(id: string, body: Partial<CreateProjectBody>): Promise<Project> {
  return tauriOrFetch<Project>("update_project", { id, project: body }, `/api/data/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return tauriOrFetch<void>("delete_project", { id }, `/api/data/projects/${id}`, { method: "DELETE" });
}

export async function getProjectExport(id: string, category: keyof ResolvedProject): Promise<string> {
  return tauriOrFetch<string>("get_project_export", { id, category }, `/api/data/projects/${id}/export/${category}`);
}

/** Full project export as a single JSON string (project + prompts, tickets, ideas, designs, architectures). For backup or download. */
export async function getFullProjectExport(id: string): Promise<string> {
  if (isTauri) {
    return invoke<string>("get_project_export", { id, category: "project" });
  } else {
    const payload = await fetchJson<unknown>(`/api/data/projects/${id}/export`);
    return JSON.stringify(payload, null, 2);
  }
}

/**
 * Read a file from the project repo (e.g. .cursor/7. planner/tickets.md).
 * In Tauri pass repoPath; in browser uses projectId.
 * Throws with a clear message when the file is missing or repo path is invalid (reliable read; clear errors when missing).
 */
export async function readProjectFile(
  projectId: string,
  relativePath: string,
  repoPath?: string
): Promise<string> {
  if (isTauri && repoPath) {
    try {
      return await invoke<string>("read_file_text_under_root", {
        root: repoPath,
        path: relativePath,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no such file|not a file|not found|does not exist|os error 2/i.test(msg)) {
        throw new Error(`${relativePath}: file not found or not accessible. ${msg}`);
      }
      if (/canonicalize|permission denied|not a directory/i.test(msg)) {
        throw new Error(`Repo path invalid or not accessible. ${msg}`);
      }
      throw new Error(`${relativePath}: ${msg}`);
    }
  }
  const res = await fetch(
    `/api/data/projects/${projectId}/file?path=${encodeURIComponent(relativePath)}`
  );
  const text = await res.text();
  if (!res.ok) {
    let errorMsg: string;
    try {
      const j = JSON.parse(text) as { error?: string };
      errorMsg = j.error ?? res.statusText;
    } catch {
      errorMsg = text || res.statusText;
    }
    if (res.status === 404) {
      throw new Error(`${relativePath}: file not found. ${errorMsg}`);
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(`${relativePath}: ${errorMsg}`);
    }
    throw new Error(`${relativePath}: ${errorMsg}`);
  }
  return text;
}

/**
 * Read a file from the project repo, or return empty string if the file does not exist.
 * Use for optional files (e.g. .cursor/7. planner/tickets.md) so the UI can load with empty data instead of showing a file-not-found error.
 */
export async function readProjectFileOrEmpty(
  projectId: string,
  relativePath: string,
  repoPath?: string
): Promise<string> {
  try {
    return await readProjectFile(projectId, relativePath, repoPath);
  } catch {
    return "";
  }
}

/**
 * Read a file from the app's .cursor folder (server process.cwd()/.cursor/). Use as fallback when project repo read returns empty.
 * @param pathUnderCursor - Path under .cursor (e.g. "0. ideas/ideas.md", "1. project/design.md"). Can also pass full path like ".cursor/0. ideas/ideas.md" (leading .cursor/ is stripped).
 */
export async function readCursorDocFromServer(pathUnderCursor: string): Promise<string> {
  const trimmed = pathUnderCursor.trim().replace(/^\.cursor\/?/, "");
  if (!trimmed) return "";
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/data/cursor-doc?path=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return "";
    const data = (await res.json().catch(() => ({}))) as { content?: string | null };
    return typeof data.content === "string" ? data.content : "";
  } catch {
    return "";
  }
}

/** Write a file under the project repo. In Tauri pass repoPath; in browser uses projectId. Falls back to fetch when invoke is not available (e.g. Tauri not ready or running in browser). */
export async function writeProjectFile(
  projectId: string,
  relativePath: string,
  content: string,
  repoPath?: string
): Promise<void> {
  if (isTauri && repoPath) {
    try {
      await invoke("write_spec_file", {
        projectPath: repoPath,
        relativePath,
        content,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        // Fall through to fetch when Tauri invoke API is not available
      } else {
        throw err;
      }
    }
  }
  const res = await fetch(`/api/data/projects/${projectId}/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: relativePath, content }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
}

/** Delete a file under the project repo. In Tauri pass repoPath; in browser uses projectId. Only files (not directories) can be deleted. */
export async function deleteProjectFile(
  projectId: string,
  relativePath: string,
  repoPath?: string
): Promise<void> {
  return deleteProjectPath(projectId, relativePath, repoPath, false);
}

/** Delete a file or directory under the project repo. When recursive is true, directories and all contents are removed. */
export async function deleteProjectPath(
  projectId: string,
  relativePath: string,
  repoPath?: string,
  recursive = false
): Promise<void> {
  if (isTauri && repoPath) {
    try {
      if (recursive) {
        await invoke("delete_path_under_root", {
          root: repoPath,
          relativePath,
          recursive: true,
        });
      } else {
        await invoke("delete_file_under_root", {
          root: repoPath,
          relativePath,
        });
      }
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        // Fall through to fetch
      } else {
        throw err;
      }
    }
  }
  const q = new URLSearchParams({ path: relativePath });
  if (recursive) q.set("recursive", "1");
  const res = await fetch(
    `/api/data/projects/${projectId}/file?${q.toString()}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
}

export type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number;
  updatedAt: string;
};

export async function listProjectFiles(
  projectId: string,
  relativePath: string = "",
  repoPath?: string
): Promise<FileEntry[]> {
  if (isTauri && repoPath) {
    try {
      return await invoke<FileEntry[]>("list_files_under_root", {
        root: repoPath,
        path: relativePath,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("invoke") && msg.includes("not available")) {
        // Fall through to fetch when Tauri invoke API is not available
      } else {
        console.warn("Tauri list_files_under_root failed:", e);
        throw new Error(msg || "File listing failed.");
      }
    }
  }

  const query = relativePath ? `?path=${encodeURIComponent(relativePath)}` : "";
  const res = await fetch(`/api/data/projects/${projectId}/files${query}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Failed to list files");
  }

  return json.files;
}

/** Relative path for agents under the KWDEV workspace (data/agents). */
const WORKSPACE_AGENTS_PATH = "data/agents";

/**
 * Load concatenated content of all .md files from the KWDEV workspace data/agents.
 * Used in Tauri so terminal-agent prompts (e.g. Ask) use @data from this app, not the target project's .cursor.
 * Returns "" if not in Tauri, workspace root is unavailable, or no agents found.
 */
export async function loadWorkspaceAgentsContent(): Promise<string> {
  if (!isTauri) return "";
  try {
    const ws = await invoke<string>("get_workspace_root");
    if (!ws?.trim()) return "";
    const entries = await invoke<FileEntry[]>("list_files_under_root", {
      root: ws,
      path: WORKSPACE_AGENTS_PATH,
    });
    const mdFiles = (entries ?? []).filter((e) => !e.isDirectory && e.name.endsWith(".md"));
    const parts: string[] = [];
    for (const f of mdFiles) {
      const content = await invoke<string>("read_file_text_under_root", {
        root: ws,
        path: `${WORKSPACE_AGENTS_PATH}/${f.name}`,
      });
      if (typeof content === "string" && content.trim()) parts.push(content.trim());
    }
    if (parts.length === 0) return "";
    return "\n\n---\n\n## Agent instructions (from workspace data/agents)\n\n" + parts.join("\n\n---\n\n");
  } catch {
    return "";
  }
}

const DEFAULT_MAX_RECURSIVE_FILES = 100_000;

export type ListAllProjectFilePathsResult = {
  paths: string[];
  truncated: boolean;
};

/**
 * Recursively list all file paths under a project root (directories are traversed, only file paths returned).
 * Respects maxFiles to avoid freezing on very large repos. Returns truncated: true when the count hit the limit.
 */
export async function listAllProjectFilePaths(
  projectId: string,
  repoPath: string,
  options?: { maxFiles?: number }
): Promise<ListAllProjectFilePathsResult> {
  const maxFiles = options?.maxFiles ?? DEFAULT_MAX_RECURSIVE_FILES;
  const paths: string[] = [];

  async function walk(relativePath: string): Promise<void> {
    if (paths.length >= maxFiles) return;
    const entries = await listProjectFiles(projectId, relativePath, repoPath);
    for (const e of entries) {
      const fullRelative = relativePath ? `${relativePath}/${e.name}` : e.name;
      if (e.isDirectory) {
        await walk(fullRelative);
      } else {
        paths.push(fullRelative);
      }
      if (paths.length >= maxFiles) return;
    }
  }

  await walk("");
  const sorted = paths.sort((a, b) => a.localeCompare(b));
  return { paths: sorted, truncated: sorted.length >= maxFiles };
}

const DEFAULT_TAURI_API_BASE = "http://127.0.0.1:4000";

/** Base URL for API when using fetch (e.g. in Tauri, webview origin may not be the Next server). */
function getApiBase(): string {
  if (typeof window === "undefined") return "";
  if (isTauri) {
    const envBase =
      typeof process !== "undefined" && process.env && (process.env as Record<string, string>).NEXT_PUBLIC_API_BASE;
    return (envBase && envBase.trim()) || DEFAULT_TAURI_API_BASE;
  }
  return window.location.origin;
}

/** Options for analyzeProjectDoc. When in Tauri, pass runTempTicket so the agent runs in the same env as terminal instead of on the server. */
export type AnalyzeProjectDocOptions = {
  runTempTicket?: (
    projectPath: string,
    promptContent: string,
    label: string,
    meta?: RunMeta
  ) => Promise<string | null>;
};

/**
 * Get the combined prompt for an analyze doc (API with promptOnly: true). Used in Tauri to run agent via Worker.
 */
export async function getAnalyzePromptOnly(
  projectId: string,
  promptPath: string,
  outputPath: string,
  repoPath?: string
): Promise<string> {
  const base = getApiBase();
  const body: { projectId: string; promptPath: string; outputPath: string; repoPath?: string; promptOnly: true } = {
    projectId,
    promptPath,
    outputPath,
    promptOnly: true,
  };
  if (repoPath?.trim()) body.repoPath = repoPath.trim();
  const res = await fetch(`${base}/api/analyze-project-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string; hint?: string; prompt?: string };
  if (!res.ok) {
    const msg = data.error || res.statusText || "Failed to get prompt";
    const hint = data.hint ? ` ${data.hint}` : "";
    const err = new Error(msg + hint) as Error & { code?: string };
    if (data.code === "PROMPT_NOT_FOUND") err.code = "PROMPT_NOT_FOUND";
    throw err;
  }
  if (typeof data.prompt !== "string" || !data.prompt.trim()) {
    throw new Error("API did not return a prompt");
  }
  return data.prompt.trim();
}

/**
 * Run analyze: in Tauri with runTempTicket, uses agent in same terminal env (no .env). In browser, uses POST /api/analyze-project-doc (server runs agent).
 */
export async function analyzeProjectDoc(
  projectId: string,
  promptPath: string,
  outputPath: string,
  repoPath?: string,
  options?: AnalyzeProjectDocOptions
): Promise<{ placeholder?: boolean; message?: string; viaWorker?: boolean }> {
  const path = repoPath?.trim();
  if (isTauri && path && options?.runTempTicket) {
    // Overwrite the file immediately so it is always replaced (no stale content); run will overwrite again with result.
    const analyzingPlaceholder = `<!-- Analyzing -->\n\n*Analysis in progress.*`;
    await writeProjectFile(projectId, outputPath, analyzingPlaceholder, path);
    const prompt = await getAnalyzePromptOnly(projectId, promptPath, outputPath, path);
    const label = `Analyze: ${outputPath.replace(/^\.cursor\//, "").replace(/\.md$/i, "")}`;
    await options.runTempTicket(path, prompt, label, {
      projectId,
      outputPath,
      onComplete: "analyze-doc",
      payload: { repoPath: path },
    });
    return { viaWorker: true };
  }

  const base = getApiBase();
  const body: { projectId: string; promptPath: string; outputPath: string; repoPath?: string } = {
    projectId,
    promptPath,
    outputPath,
  };
  if (repoPath?.trim()) body.repoPath = repoPath.trim();
  const res = await fetch(`${base}/api/analyze-project-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    code?: string;
    error?: string;
    hint?: string;
    ok?: boolean;
    placeholder?: boolean;
    message?: string;
  };
  if (!res.ok) {
    const msg = data.error || res.statusText || "Analyze failed";
    const hint = data.hint ? ` ${data.hint}` : "";
    const err = new Error(msg + hint) as Error & { code?: string };
    if (data.code === "PROMPT_NOT_FOUND") err.code = "PROMPT_NOT_FOUND";
    throw err;
  }
  if (data.placeholder && data.message) {
    return { placeholder: true, message: data.message };
  }
  return {};
}

/**
 * Strip cursor/terminal output from all analysis .md files in the repo.
 * POST /api/clean-analysis-docs with projectId and repoPath.
 */
export async function cleanAnalysisDocs(projectId: string, repoPath: string): Promise<{ cleaned: number; skipped: number }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/clean-analysis-docs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, repoPath: repoPath.trim() }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; cleaned?: number; skipped?: number };
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Clean failed");
  }
  return { cleaned: data.cleaned ?? 0, skipped: data.skipped ?? 0 };
}

/* ═══ Analyze queue (worker tab): prompts as tickets, 3 at a time ═══ */

export type AnalyzeJobStatus = "pending" | "running" | "done" | "failed";

export type AnalyzeJob = {
  id: string;
  promptPath: string;
  outputPath: string;
  status: AnalyzeJobStatus;
};

export type AnalyzeQueueData = { jobs: AnalyzeJob[] };

/** Default 8 analyze jobs (same order as ANALYZE_ALL_CONFIG). */
export const DEFAULT_ANALYZE_JOBS: Omit<AnalyzeJob, "status">[] = ANALYZE_JOB_IDS.map((id) => ({
  id,
  promptPath: getPromptPath(id),
  outputPath: getOutputPath(id),
}));

/** Write the analyze queue to the project repo (all jobs pending). */
export async function writeAnalyzeQueue(
  projectId: string,
  repoPath: string,
  jobs: Omit<AnalyzeJob, "status">[] = DEFAULT_ANALYZE_JOBS
): Promise<void> {
  const data: AnalyzeQueueData = {
    jobs: jobs.map((j) => ({ ...j, status: "pending" as AnalyzeJobStatus })),
  };
  await writeProjectFile(projectId, ANALYZE_QUEUE_PATH, JSON.stringify(data, null, 2), repoPath);
}

/** Read the analyze queue from the project repo. */
export async function readAnalyzeQueue(
  projectId: string,
  repoPath?: string
): Promise<AnalyzeQueueData | null> {
  const raw = await readProjectFileOrEmpty(projectId, ANALYZE_QUEUE_PATH, repoPath);
  if (!raw.trim()) return null;
  try {
    const data = JSON.parse(raw) as AnalyzeQueueData;
    if (!Array.isArray(data.jobs)) return null;
    return data;
  } catch {
    return null;
  }
}

const ANALYZE_CONCURRENCY = 3;

/**
 * Process the analyze queue: run up to ANALYZE_CONCURRENCY (3) jobs at a time.
 * getQueue/setQueue read/write the queue file (e.g. via readAnalyzeQueue + writeProjectFile).
 */
export async function runAnalyzeQueueProcessing(
  projectId: string,
  repoPath: string,
  options: {
    getQueue: () => Promise<AnalyzeQueueData | null>;
    setQueue: (data: AnalyzeQueueData) => Promise<void>;
    onProgress?: (completed: number, total: number) => void;
    onJobComplete?: (id: string, status: "done" | "failed") => void;
  }
): Promise<{ completed: number; failed: number }> {
  const { getQueue, setQueue, onProgress, onJobComplete } = options;
  let completed = 0;
  let failed = 0;

  const runOne = async (job: AnalyzeJob): Promise<"done" | "failed"> => {
    try {
      await analyzeProjectDoc(projectId, job.promptPath, job.outputPath, repoPath);
      onJobComplete?.(job.id, "done");
      return "done";
    } catch {
      onJobComplete?.(job.id, "failed");
      return "failed";
    }
  };

  while (true) {
    const data = await getQueue();
    if (!data?.jobs?.length) break;
    const pending = data.jobs.filter((j) => j.status === "pending");
    if (pending.length === 0) break;

    const batch = pending.slice(0, ANALYZE_CONCURRENCY);
    for (const j of batch) {
      j.status = "running";
    }
    await setQueue(data);

    const results = await Promise.all(batch.map(runOne));
    completed += results.filter((r) => r === "done").length;
    failed += results.filter((r) => r === "failed").length;

    const next = await getQueue();
    if (!next) break;
    const batchIds = new Set(batch.map((b) => b.id));
    for (let i = 0; i < results.length; i++) {
      const job = next.jobs.find((j) => j.id === batch[i].id);
      if (job) job.status = results[i];
    }
    await setQueue(next);
    onProgress?.(completed + failed, next.jobs.length);
  }

  return { completed, failed };
}

// --- Project Documents (database storage) ---

export type ProjectDocType = "ideas" | "design" | "architecture" | "testing" | "documentation" | "project_info";

/**
 * Get a project document from the database.
 * In Tauri: uses get_project_doc command.
 * In browser: falls back to file-based storage for now.
 */
export async function getProjectDoc(projectId: string, docType: ProjectDocType): Promise<string> {
  if (isTauri) {
    return invoke<string>("get_project_doc", { args: { projectId, docType } });
  }
  // Browser fallback: not supported, return empty
  return "";
}

/**
 * Set a project document in the database.
 * In Tauri: uses set_project_doc command.
 */
export async function setProjectDoc(projectId: string, docType: ProjectDocType, content: string): Promise<void> {
  if (isTauri) {
    await invoke("set_project_doc", { args: { projectId, docType, content } });
    return;
  }
  // Browser fallback: not supported
  throw new Error("setProjectDoc is only available in Tauri");
}

/**
 * Get all project documents for a project.
 */
export async function getAllProjectDocs(projectId: string): Promise<Array<{ doc_type: string; content: string; created_at: string; updated_at: string }>> {
  if (isTauri) {
    return invoke<Array<{ doc_type: string; content: string; created_at: string; updated_at: string }>>("get_all_project_docs", { projectId });
  }
  return [];
}

// --- Project Configs (database storage) ---

export type ProjectConfigType = "frontend" | "backend";

export interface ProjectConfigResult {
  config: Record<string, unknown>;
  analysis: string | null;
}

/**
 * Get a project config from the database.
 * In Tauri: uses get_project_config command.
 */
export async function getProjectConfig(projectId: string, configType: ProjectConfigType): Promise<ProjectConfigResult> {
  if (isTauri) {
    return invoke<ProjectConfigResult>("get_project_config", { args: { projectId, configType } });
  }
  return { config: {}, analysis: null };
}

/**
 * Set a project config in the database.
 * In Tauri: uses set_project_config command.
 */
export async function setProjectConfig(
  projectId: string,
  configType: ProjectConfigType,
  config: Record<string, unknown>,
  analysisContent?: string
): Promise<void> {
  if (isTauri) {
    const configJson = JSON.stringify(config);
    await invoke("set_project_config", { args: { projectId, configType, configJson, analysisContent } });
    return;
  }
  throw new Error("setProjectConfig is only available in Tauri");
}

/**
 * Get all project configs for a project.
 */
export async function getAllProjectConfigs(projectId: string): Promise<Array<{ config_type: string; config: Record<string, unknown>; analysis: string | null; created_at: string; updated_at: string }>> {
  if (isTauri) {
    return invoke<Array<{ config_type: string; config: Record<string, unknown>; analysis: string | null; created_at: string; updated_at: string }>>("get_all_project_configs", { projectId });
  }
  return [];
}
