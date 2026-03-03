"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { describeCronSchedule } from "@/lib/zeroclaw-parser";
import { Play, Trash2, Plus, Clock } from "lucide-react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  handler: string;
  status: string;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  errorCount: number;
}

export function BotCronTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCrons = async () => {
    try {
      const res = await fetch(`/api/ai-bots/cron?sessionId=${sessionId}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrons();
  }, [sessionId]);

  const handleRunNow = async (handler: string) => {
    try {
      const res = await fetch("/api/ai-bots/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "run_now", handler }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Failed to run job");
        return;
      }
      // Refresh list only; do not navigate or reload
      loadCrons();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load crons" message={error} />;
  }

  return (
    <div className="space-y-6">
      {jobs.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No cron jobs configured</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id} className="bg-card-tint-2">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm">{job.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {describeCronSchedule(job.schedule)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRunNow(job.handler);
                      }}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    <Button type="button" size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-mono">{job.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Runs:</span>
                    <span className="ml-2 font-mono">{job.runCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="ml-2 font-mono">{job.errorCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Handler:</span>
                    <code className="ml-2 text-xs bg-muted/50 px-1 rounded truncate block">{job.handler}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Cron Job
      </Button>
    </div>
  );
}
