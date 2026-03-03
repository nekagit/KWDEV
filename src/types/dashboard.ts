/**
 * Dashboard metrics types. Returned by Tauri get_dashboard_metrics or GET /api/data/dashboard-metrics.
 */
/** Dashboard metrics returned by get_dashboard_metrics (Tauri) or GET /api/data/dashboard-metrics */
export interface DashboardMetrics {
  tickets_count: number;
  prompts_count: number;
  designs_count: number;
  active_projects_count: number;
  all_projects_count: number;
}
