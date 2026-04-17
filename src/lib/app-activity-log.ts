"use client";

/**
 * App-wide activity log persisted in localStorage.
 * Used for lightweight audit/debug visibility across UI actions and run jobs.
 */

export type AppActivityLogEntry = {
  id: string;
  timestamp: string;
  source: string;
  message: string;
};

const STORAGE_KEY = "kwdev.app.activityLogs.v1";
const MAX_LOGS = 1000;
export const APP_ACTIVITY_EVENT = "kwdev:app-activity-log";

function safeParse(raw: string | null): AppActivityLogEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AppActivityLogEntry => {
      if (!item || typeof item !== "object") return false;
      const obj = item as Partial<AppActivityLogEntry>;
      return (
        typeof obj.id === "string" &&
        typeof obj.timestamp === "string" &&
        typeof obj.source === "string" &&
        typeof obj.message === "string"
      );
    });
  } catch {
    return [];
  }
}

export function getAppActivityLogs(): AppActivityLogEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function logAppActivity(source: string, message: string): void {
  if (typeof window === "undefined") return;
  const entry: AppActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source,
    message,
  };
  const current = getAppActivityLogs();
  const next = [entry, ...current].slice(0, MAX_LOGS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(APP_ACTIVITY_EVENT, { detail: entry }));
}

export function clearAppActivityLogs(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent(APP_ACTIVITY_EVENT));
}
