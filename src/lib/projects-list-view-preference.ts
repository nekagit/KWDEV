/**
 * Persist Projects list page sort and filter preferences in localStorage.
 * Used by ProjectsListPageContent. See ADR 0121.
 */

const STORAGE_KEY = "kwcode-projects-list-view-preference";

/** Custom event name dispatched when projects list view preference is restored to defaults (e.g. from Command palette). ProjectsListPageContent listens to sync its local state. */
export const PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT =
  "kwcode-projects-list-view-preference-restored";
const MAX_FILTER_LENGTH = 500;

export type ProjectsListSortOrder = "asc" | "desc" | "recent";

const VALID_SORT: ProjectsListSortOrder[] = ["asc", "desc", "recent"];

function isValidSort(v: unknown): v is ProjectsListSortOrder {
  return typeof v === "string" && VALID_SORT.includes(v as ProjectsListSortOrder);
}

export interface ProjectsListViewPreference {
  sortOrder: ProjectsListSortOrder;
  filterQuery: string;
}

export const DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE: ProjectsListViewPreference = {
  sortOrder: "asc",
  filterQuery: "",
};

const DEFAULTS = DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE;

/**
 * Read and validate Projects list view preference from localStorage.
 * Invalid or missing values use defaults. SSR-safe (returns defaults when window is undefined).
 */
export function getProjectsListViewPreference(): ProjectsListViewPreference {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sortOrder = isValidSort(parsed.sortOrder) ? parsed.sortOrder : DEFAULTS.sortOrder;
    const filterQuery =
      typeof parsed.filterQuery === "string"
        ? parsed.filterQuery.slice(0, MAX_FILTER_LENGTH)
        : DEFAULTS.filterQuery;
    return { sortOrder, filterQuery };
  } catch {
    return DEFAULTS;
  }
}

export interface ProjectsListViewPreferencePartial {
  sortOrder?: ProjectsListSortOrder;
  filterQuery?: string;
}

/**
 * Write Projects list view preference to localStorage. Only provided fields are updated.
 */
export function setProjectsListViewPreference(
  partial: ProjectsListViewPreferencePartial
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getProjectsListViewPreference();
    const next: ProjectsListViewPreference = {
      sortOrder:
        partial.sortOrder !== undefined && isValidSort(partial.sortOrder)
          ? partial.sortOrder
          : current.sortOrder,
      filterQuery:
        partial.filterQuery !== undefined
          ? String(partial.filterQuery).slice(0, MAX_FILTER_LENGTH)
          : current.filterQuery,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
