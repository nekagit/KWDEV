/**
 * Persist Prompts page view preferences in localStorage.
 * Used by PromptRecordsPageContent. See ADR 0123.
 */

const STORAGE_KEY = "kwcode-prompts-view-preference";
const MAX_FILTER_LENGTH = 500;

export type PromptsViewMainTab = "cursor-prompts" | "general";
export type PromptsViewSort = "newest" | "oldest" | "title-asc" | "title-desc";

const VALID_MAIN_TAB: PromptsViewMainTab[] = ["cursor-prompts", "general"];
const VALID_SORT: PromptsViewSort[] = ["newest", "oldest", "title-asc", "title-desc"];

function isValidMainTab(v: unknown): v is PromptsViewMainTab {
  return typeof v === "string" && VALID_MAIN_TAB.includes(v as PromptsViewMainTab);
}

function isValidSort(v: unknown): v is PromptsViewSort {
  return typeof v === "string" && VALID_SORT.includes(v as PromptsViewSort);
}

export interface PromptsViewPreference {
  mainTab: PromptsViewMainTab;
  sort: PromptsViewSort;
  filterQuery: string;
}

export const DEFAULT_PROMPTS_VIEW_PREFERENCE: PromptsViewPreference = {
  mainTab: "cursor-prompts",
  sort: "newest",
  filterQuery: "",
};

const DEFAULTS = DEFAULT_PROMPTS_VIEW_PREFERENCE;

/**
 * Read and validate Prompts view preference from localStorage.
 * Invalid or missing values use defaults. SSR-safe (returns defaults when window is undefined).
 */
export function getPromptsViewPreference(): PromptsViewPreference {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mainTab = isValidMainTab(parsed.mainTab) ? parsed.mainTab : DEFAULTS.mainTab;
    const sort = isValidSort(parsed.sort) ? parsed.sort : DEFAULTS.sort;
    const filterQuery =
      typeof parsed.filterQuery === "string"
        ? parsed.filterQuery.slice(0, MAX_FILTER_LENGTH)
        : DEFAULTS.filterQuery;
    return { mainTab, sort, filterQuery };
  } catch {
    return DEFAULTS;
  }
}

export interface PromptsViewPreferencePartial {
  mainTab?: PromptsViewMainTab;
  sort?: PromptsViewSort;
  filterQuery?: string;
}

/**
 * Write Prompts view preference to localStorage. Only provided fields are updated.
 */
export function setPromptsViewPreference(partial: PromptsViewPreferencePartial): void {
  if (typeof window === "undefined") return;
  try {
    const current = getPromptsViewPreference();
    const next: PromptsViewPreference = {
      mainTab:
        partial.mainTab !== undefined && isValidMainTab(partial.mainTab)
          ? partial.mainTab
          : current.mainTab,
      sort:
        partial.sort !== undefined && isValidSort(partial.sort) ? partial.sort : current.sort,
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
