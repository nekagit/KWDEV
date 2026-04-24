"use client";

import React from "react";

type IntegrityReport = {
  projectId: string;
  counts: { ideas: number; milestones: number; tickets: number };
  discrepancies: Record<string, number>;
};

export function ProjectPlannerDiscrepanciesTab({ projectId }: { projectId: string }) {
  const [report, setReport] = React.useState<IntegrityReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data/projects/${encodeURIComponent(projectId)}/integrity-report`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load integrity report");
      setReport((await response.json()) as IntegrityReport);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <div className="space-y-3" data-testid="planner-discrepancies-tab">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Integrity report</p>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs"
          onClick={() => void loadReport()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {report ? (
        <div className="rounded border border-border/60 p-3 text-xs space-y-2">
          <p>Ideas: {report.counts.ideas} | Milestones: {report.counts.milestones} | Tickets: {report.counts.tickets}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(report.discrepancies).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                <span>{key}</span>
                <span className={value > 0 ? "text-amber-500" : "text-emerald-500"}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No report yet.</p>
      )}
    </div>
  );
}
