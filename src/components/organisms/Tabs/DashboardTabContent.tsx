"use client";

/** Dashboard Tab Content component. */
import { useCallback, useState } from "react";
import { SimpleDashboard } from "@/components/organisms/Dashboards/SimpleDashboard";
import { getClasses } from "@/components/molecules/tailwind-molecules";
import { useRunState } from "@/store/run-store";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RelativeTimeWithTooltip } from "@/components/molecules/Displays/RelativeTimeWithTooltip";

const classes = getClasses("TabAndContentSections/DashboardTabContent.tsx");

export function DashboardTabContent() {
  const { refreshData, lastRefreshedAt, setActiveProjects } = useRunState();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
      toast.success("Data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  return (
    <div className={classes[0]}>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
        {lastRefreshedAt != null && (
          <span className="text-xs text-muted-foreground mr-2 self-center">
            Last refreshed: <RelativeTimeWithTooltip timestamp={lastRefreshedAt} />
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          aria-label="Refresh data (projects, prompts)"
          title="Refresh projects and prompts from app data"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden />
          )}
          Refresh data
        </Button>
      </div>
      <section className="mb-6">
        <SimpleDashboard setActiveProjects={setActiveProjects} />
      </section>
    </div>
  );
}
