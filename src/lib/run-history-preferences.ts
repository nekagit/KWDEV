/**
 * Persist run history sort and filter preferences in localStorage.
 * Used by WorkerHistorySection in ProjectRunTab. See ADR 0230.
 */

import { MAX_TERMINAL_SLOTS } from "@/types/run";

const STORAGE_KEY = "kwcode-run-history-preferences";

/** Custom event name dispatched when run history preferences are restored to defaults (e.g. from Command palette). ProjectRunTab listens to sync its local state. */
export const RUN_HISTORY_PREFERENCES_RESTORED_EVENT = "kwcode-run-history-preferences-restored";

/** Max length of persisted "Filter by label or output" search text. */
export const RUN_HISTORY_FILTER_QUERY_MAX_LEN = 500;
const FILTER_QUERY_MAX_LEN = RUN_HISTORY_FILTER_QUERY_MAX_LEN;

export type StoredSortOrder = "newest" | "oldest" | "shortest" | "longest";
export type StoredExitStatusFilter = "all" | "success" | "failed";
export type StoredDateRangeFilter = "all" | "24h" | "7d" | "30d";
export type StoredSlotFilter = "all" | (string & {});

const VALID_SORT: StoredSortOrder[] = ["newest", "oldest", "shortest", "longest"];
const VALID_EXIT: StoredExitStatusFilter[] = ["all", "success", "failed"];
const VALID_DATE: StoredDateRangeFilter[] = ["all", "24h", "7d", "30d"];
/** Slot filter options for History UI: "all" and "1"..MAX_TERMINAL_SLOTS. */
export const VALID_SLOT_OPTIONS: string[] = ["all", ...Array.from({ length: MAX_TERMINAL_SLOTS }, (_, i) => String(i + 1))];

function isValidSort(v: unknown): v is StoredSortOrder {
  return typeof v === "string" && VALID_SORT.includes(v as StoredSortOrder);
}
function isValidExit(v: unknown): v is StoredExitStatusFilter {
  return typeof v === "string" && VALID_EXIT.includes(v as StoredExitStatusFilter);
}
function isValidDate(v: unknown): v is StoredDateRangeFilter {
  return typeof v === "string" && VALID_DATE.includes(v as StoredDateRangeFilter);
}
function isValidSlot(v: unknown): v is StoredSlotFilter {
  if (typeof v !== "string") return false;
  if (v === "all") return true;
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && n <= MAX_TERMINAL_SLOTS && v === String(n);
}

function normalizeFilterQuery(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, FILTER_QUERY_MAX_LEN);
}

export interface RunHistoryPreferences {
  sortOrder: StoredSortOrder;
  exitStatusFilter: StoredExitStatusFilter;
  dateRangeFilter: StoredDateRangeFilter;
  slotFilter: StoredSlotFilter;
  /** Persisted "Filter by label or output" search text; trimmed and capped at FILTER_QUERY_MAX_LEN. */
  filterQuery: string;
}

/** Default run history preferences. Exported for "Restore defaults" UI (ADR 0231). */
export const DEFAULT_RUN_HISTORY_PREFERENCES: RunHistoryPreferences = {
  sortOrder: "newest",
  exitStatusFilter: "all",
  dateRangeFilter: "all",
  slotFilter: "all",
  filterQuery: "",
};

const DEFAULTS = DEFAULT_RUN_HISTORY_PREFERENCES;

/**
 * Read and validate run history preferences from localStorage.
 * Invalid or missing values use defaults.
 */
export function getRunHistoryPreferences(): RunHistoryPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      sortOrder: isValidSort(parsed.sortOrder) ? parsed.sortOrder : DEFAULTS.sortOrder,
      exitStatusFilter: isValidExit(parsed.exitStatusFilter) ? parsed.exitStatusFilter : DEFAULTS.exitStatusFilter,
      dateRangeFilter: isValidDate(parsed.dateRangeFilter) ? parsed.dateRangeFilter : DEFAULTS.dateRangeFilter,
      slotFilter: isValidSlot(parsed.slotFilter) ? parsed.slotFilter : DEFAULTS.slotFilter,
      filterQuery: normalizeFilterQuery(parsed.filterQuery),
    };
  } catch {
    return DEFAULTS;
  }
}

export interface RunHistoryPreferencesPartial {
  sortOrder?: StoredSortOrder;
  exitStatusFilter?: StoredExitStatusFilter;
  dateRangeFilter?: StoredDateRangeFilter;
  slotFilter?: StoredSlotFilter;
  filterQuery?: string;
}

/**
 * Write run history preferences to localStorage. Only provided fields are updated.
 */
export function setRunHistoryPreferences(partial: RunHistoryPreferencesPartial): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRunHistoryPreferences();
    const next: RunHistoryPreferences = {
      sortOrder: partial.sortOrder !== undefined && isValidSort(partial.sortOrder) ? partial.sortOrder : current.sortOrder,
      exitStatusFilter: partial.exitStatusFilter !== undefined && isValidExit(partial.exitStatusFilter) ? partial.exitStatusFilter : current.exitStatusFilter,
      dateRangeFilter: partial.dateRangeFilter !== undefined && isValidDate(partial.dateRangeFilter) ? partial.dateRangeFilter : current.dateRangeFilter,
      slotFilter: partial.slotFilter !== undefined && isValidSlot(partial.slotFilter) ? partial.slotFilter : current.slotFilter,
      filterQuery: partial.filterQuery !== undefined ? normalizeFilterQuery(partial.filterQuery) : current.filterQuery,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
