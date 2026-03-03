/**
 * Persist project Design and Architecture tab filter/sort preferences per project in localStorage.
 * Used by ProjectDesignTab and ProjectArchitectureTab. See ADR 0135.
 */

const DESIGN_STORAGE_KEY_PREFIX = "kwcode-project-design-prefs-";
const ARCHITECTURE_STORAGE_KEY_PREFIX = "kwcode-project-architecture-prefs-";

/** Max length of persisted filter query. */
export const FILTER_QUERY_MAX_LEN = 500;

/** Alias for consumers that prefer a longer name. */
export const PROJECT_DESIGN_ARCH_FILTER_QUERY_MAX_LEN = FILTER_QUERY_MAX_LEN;

export type DesignSortOrder = "name-asc" | "name-desc";
export type ArchitectureSortOrder = "name-asc" | "name-desc";

const VALID_SORT = ["name-asc", "name-desc"] as const;

function isValidSort(v: unknown): v is DesignSortOrder {
  return typeof v === "string" && VALID_SORT.includes(v as DesignSortOrder);
}

function normalizeFilterQuery(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, FILTER_QUERY_MAX_LEN);
}

export interface ProjectDesignPreferences {
  filterQuery: string;
  sortOrder: DesignSortOrder;
}

export interface ProjectArchitecturePreferences {
  filterQuery: string;
  sortOrder: ArchitectureSortOrder;
}

export const DEFAULT_PROJECT_DESIGN_PREFERENCES: ProjectDesignPreferences = {
  filterQuery: "",
  sortOrder: "name-asc",
};

export const DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES: ProjectArchitecturePreferences = {
  filterQuery: "",
  sortOrder: "name-asc",
};

/**
 * Sanitize projectId for use in localStorage key (alphanumeric, hyphen, underscore only).
 */
function sanitizeProjectId(projectId: string): string {
  return projectId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200) || "default";
}

export type ProjectDesignPreferencesPartial = Partial<ProjectDesignPreferences>;
export type ProjectArchitecturePreferencesPartial = Partial<ProjectArchitecturePreferences>;

/**
 * Read design tab preferences for a project. SSR-safe.
 */
export function getProjectDesignPreferences(projectId: string): ProjectDesignPreferences {
  if (typeof window === "undefined" || !projectId) return DEFAULT_PROJECT_DESIGN_PREFERENCES;
  try {
    const key = DESIGN_STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PROJECT_DESIGN_PREFERENCES;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      filterQuery: normalizeFilterQuery(parsed.filterQuery),
      sortOrder: isValidSort(parsed.sortOrder) ? parsed.sortOrder : DEFAULT_PROJECT_DESIGN_PREFERENCES.sortOrder,
    };
  } catch {
    return DEFAULT_PROJECT_DESIGN_PREFERENCES;
  }
}

/**
 * Write design tab preferences for a project. Only provided fields are updated.
 */
export function setProjectDesignPreferences(projectId: string, partial: ProjectDesignPreferencesPartial): void {
  if (typeof window === "undefined" || !projectId) return;
  try {
    const current = getProjectDesignPreferences(projectId);
    const next: ProjectDesignPreferences = {
      filterQuery: partial.filterQuery !== undefined ? normalizeFilterQuery(partial.filterQuery) : current.filterQuery,
      sortOrder: partial.sortOrder !== undefined && isValidSort(partial.sortOrder) ? partial.sortOrder : current.sortOrder,
    };
    const key = DESIGN_STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Read architecture tab preferences for a project. SSR-safe.
 */
export function getProjectArchitecturePreferences(projectId: string): ProjectArchitecturePreferences {
  if (typeof window === "undefined" || !projectId) return DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES;
  try {
    const key = ARCHITECTURE_STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      filterQuery: normalizeFilterQuery(parsed.filterQuery),
      sortOrder: isValidSort(parsed.sortOrder) ? parsed.sortOrder : DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES.sortOrder,
    };
  } catch {
    return DEFAULT_PROJECT_ARCHITECTURE_PREFERENCES;
  }
}

/**
 * Write architecture tab preferences for a project. Only provided fields are updated.
 */
export function setProjectArchitecturePreferences(
  projectId: string,
  partial: ProjectArchitecturePreferencesPartial
): void {
  if (typeof window === "undefined" || !projectId) return;
  try {
    const current = getProjectArchitecturePreferences(projectId);
    const next: ProjectArchitecturePreferences = {
      filterQuery:
        partial.filterQuery !== undefined ? normalizeFilterQuery(partial.filterQuery) : current.filterQuery,
      sortOrder:
        partial.sortOrder !== undefined && isValidSort(partial.sortOrder) ? partial.sortOrder : current.sortOrder,
    };
    const key = ARCHITECTURE_STORAGE_KEY_PREFIX + sanitizeProjectId(projectId);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}
