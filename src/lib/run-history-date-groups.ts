/**
 * Run history date grouping for the Run tab History table.
 * Buckets runs by local date: Today, Yesterday, Last 7 days, Older.
 * Used for visual section headers only; no persistence.
 */

import type { TerminalOutputHistoryEntry } from "@/types/run";

export type RunHistoryDateGroupKey = "today" | "yesterday" | "last7" | "older";

export const RUN_HISTORY_DATE_GROUP_LABELS: Record<RunHistoryDateGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  older: "Older",
};

const GROUP_ORDER: RunHistoryDateGroupKey[] = ["today", "yesterday", "last7", "older"];

/** Start of today in local time (ms). */
function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Start of yesterday in local time (ms). */
function startOfYesterdayMs(): number {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Return the date group key for a timestamp (ms since epoch).
 * Uses local date boundaries.
 */
export function getRunHistoryDateGroupKey(ts: number): RunHistoryDateGroupKey {
  const now = Date.now();
  const startToday = startOfTodayMs();
  const startYesterday = startOfYesterdayMs();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  if (ts >= startToday) return "today";
  if (ts >= startYesterday) return "yesterday";
  if (ts >= sevenDaysAgo) return "last7";
  return "older";
}

export interface RunHistoryByDateGroups {
  today: TerminalOutputHistoryEntry[];
  yesterday: TerminalOutputHistoryEntry[];
  last7: TerminalOutputHistoryEntry[];
  older: TerminalOutputHistoryEntry[];
}

/**
 * Split history entries into date groups (today, yesterday, last7, older).
 * Preserves the order of entries within each group (same as input order).
 */
export function groupRunHistoryByDate(
  entries: TerminalOutputHistoryEntry[]
): RunHistoryByDateGroups {
  const result: RunHistoryByDateGroups = {
    today: [],
    yesterday: [],
    last7: [],
    older: [],
  };

  for (const entry of entries) {
    const ms = new Date(entry.timestamp).getTime();
    const key = Number.isFinite(ms) ? getRunHistoryDateGroupKey(ms) : "older";
    result[key].push(entry);
  }

  return result;
}

/** Ordered list of group keys for rendering (today first, then yesterday, etc.). */
export function getRunHistoryDateGroupOrder(): RunHistoryDateGroupKey[] {
  return [...GROUP_ORDER];
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

/**
 * Return a human-readable title for the date group (for tooltip/aria).
 * Locale-aware; e.g. "Today (Feb 18, 2026)", "Last 7 days (Feb 11 – Feb 18, 2026)".
 */
export function getRunHistoryDateGroupTitle(key: RunHistoryDateGroupKey): string {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(now);
  startYesterday.setDate(startYesterday.getDate() - 1);
  startYesterday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  switch (key) {
    case "today":
      return `Today (${startToday.toLocaleDateString(undefined, DATE_OPTIONS)})`;
    case "yesterday":
      return `Yesterday (${startYesterday.toLocaleDateString(undefined, DATE_OPTIONS)})`;
    case "last7":
      return `Last 7 days (${sevenDaysAgo.toLocaleDateString(undefined, DATE_OPTIONS)} – ${startToday.toLocaleDateString(undefined, DATE_OPTIONS)})`;
    case "older":
      return `Older (before ${sevenDaysAgo.toLocaleDateString(undefined, DATE_OPTIONS)})`;
    default:
      return RUN_HISTORY_DATE_GROUP_LABELS[key];
  }
}
