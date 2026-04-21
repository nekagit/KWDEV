/**
 * Persist project detail tab preference per project in localStorage.
 * Used by ProjectDetailsPageContent. See ADR 0127.
 */

const STORAGE_KEY_PREFIX = "kwcode-project-tab-";

/** Valid tab values for project detail tabs (must match ProjectDetailsPageContent TAB_ROW_1 + TAB_ROW_2). */
export const VALID_PROJECT_DETAIL_TABS = [
  "project",
  "ideas",
  "milestones",
  "todo",
  "run",
  "setup",
  "worker",
  "control",
  "git",
] as const;

export type ProjectDetailTabValue = (typeof VALID_PROJECT_DETAIL_TABS)[number];

const VALID_SET = new Set<string>(VALID_PROJECT_DETAIL_TABS);

function isValidTab(v: unknown): v is ProjectDetailTabValue {
  return typeof v === "string" && VALID_SET.has(v);
}

/** Default tab when no preference is stored (matches ProjectDetailsPageContent default). */
export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTabValue = "worker";

/**
 * Sanitize projectId for use in localStorage key (alphanumeric, hyphen, underscore only).
 */
function sanitizeProjectId(projectId: string): string {
  return projectId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200) || "default";
}

/**
 * Read project detail tab preference for a project. SSR-safe (returns default when window is undefined).
 */
export function getProjectDetailTabPreference(projectId: string): ProjectDetailTabValue {
  if (typeof window === "undefined" || !projectId) return DEFAULT_PROJECT_DETAIL_TAB;
  try {
    const key = STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PROJECT_DETAIL_TAB;
    const value = raw.trim();
    return isValidTab(value) ? value : DEFAULT_PROJECT_DETAIL_TAB;
  } catch {
    return DEFAULT_PROJECT_DETAIL_TAB;
  }
}

/**
 * Write project detail tab preference for a project.
 * Accepts string (e.g. from Tabs onValueChange); invalid values are ignored.
 */
export function setProjectDetailTabPreference(projectId: string, tab: string): void {
  if (typeof window === "undefined" || !projectId) return;
  if (!isValidTab(tab)) return;
  try {
    const key = STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    localStorage.setItem(key, tab);
  } catch {
    // ignore
  }
}
