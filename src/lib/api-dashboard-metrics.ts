/**
 * Dashboard metrics API: Tauri invoke when in Tauri, else GET /api/data/dashboard-metrics.
 * Single module used by SimpleDashboard and DashboardMetricsCards.
 * If invoke is not available yet (e.g. Tauri bridge not ready), falls back to fetch.
 */
import { invoke, isTauri } from "@/lib/tauri";
import type { DashboardMetrics } from "@/types/dashboard";

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch("/api/data/dashboard-metrics");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (isTauri) {
    try {
      return await invoke<DashboardMetrics>("get_dashboard_metrics", {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        return fetchDashboardMetrics();
      }
      throw err;
    }
  }
  return fetchDashboardMetrics();
}
