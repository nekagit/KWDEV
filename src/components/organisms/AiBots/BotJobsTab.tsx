"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { describeCronSchedule } from "@/lib/zeroclaw-parser";
import { getServerApiUrl } from "@/lib/server-api-url";
import { Play, Power, Plus, Clock, RefreshCw, Database, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id?: number | string;
  name: string;
  schedule: string;
  handler: string;
  enabled: boolean | number;
  last_run?: string;
  run_count?: number;
  error_count?: number;
}

export function BotJobsTab({
  sessionId,
  botPath,
  templateJob,
}: {
  sessionId: string;
  botPath: string;
  templateJob?: { name: string; schedule: string; handler: string } | null;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSchedule, setAddSchedule] = useState("");
  const [addHandler, setAddHandler] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | number | null>(null);
  const [installingRunner, setInstallingRunner] = useState(false);
  const dbPath = `${botPath}/cron/jobs.db`;

  const basePath =
    botPath.includes("/agents/") || botPath.includes("/agent/")
      ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
      : "/var/www/ai";

  const handleInstallRunner = async () => {
    setInstallingRunner(true);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/cron/install-runner"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, basePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(data.message || "Cron runner installed.");
      } else {
        toast.error(data.error || "Failed to install runner");
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to install runner");
    } finally {
      setInstallingRunner(false);
    }
  };

  const loadJobs = async (backgroundRefresh = false) => {
    if (!backgroundRefresh) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(
        getServerApiUrl(`/api/ai-bots/jobs?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`)
      );
      const data = await res.json();

      if (res.ok && data.jobs) {
        setJobs(data.jobs);
        setError(null);
      } else {
        if (!backgroundRefresh) {
          setJobs([]);
          setError(data.error || "Failed to load jobs");
        }
      }
    } catch (err) {
      if (!backgroundRefresh) {
        setError((err as Error).message || "Failed to load jobs");
        setJobs([]);
      }
    } finally {
      if (!backgroundRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(false);
    const interval = setInterval(() => loadJobs(true), 15000); // Poll every 15s without showing loading
    return () => clearInterval(interval);
  }, [sessionId, botPath]);

  useEffect(() => {
    if (templateJob) {
      setAddName(templateJob.name);
      setAddSchedule(templateJob.schedule);
      setAddHandler(templateJob.handler);
      setAddOpen(true);
      toast.success("Template loaded! Review and click 'Add Job' to create.");
    }
  }, [templateJob]);

  const handleRunNow = async (job: Job) => {
    setRunningJobId(job.id || job.name);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          action: "run_now",
          jobId: job.id,
          handler: job.handler,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to run job");
        return;
      }
      await loadJobs();
      const exitCode = data.exitCode ?? -1;
      const stderr = (data.stderr || "").trim();
      if (exitCode !== 0) {
        const msg = stderr || data.message || `Exit code ${exitCode}`;
        // Show full message for exit 127 (command not found) so Cursor CLI hint is visible
        const maxLen = exitCode === 127 ? 400 : 120;
        toast.error(`Job failed: ${msg.length > maxLen ? msg.slice(0, maxLen) + "…" : msg}`);
      } else {
        toast.success("Job completed");
      }
    } catch (err) {
      console.error("Failed to run job:", err);
      toast.error((err as Error).message || "Failed to run job");
    } finally {
      setRunningJobId(null);
    }
  };

  const handleToggleJob = async (job: Job) => {
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          action: "toggle",
          jobId: job.id,
          enabled: !job.enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await loadJobs();
        toast.success(job.enabled ? "Job disabled" : "Job enabled");
      } else {
        toast.error(data?.error || "Failed to toggle job");
      }
    } catch (err) {
      console.error("Failed to toggle job:", err);
      toast.error((err as Error).message || "Failed to toggle job");
    }
  };

  const handleDeleteJob = async (job: Job) => {
    const id = job.id ?? job.name;
    if (id === undefined || id === null || id === "") {
      toast.error("Cannot remove job: missing id");
      return;
    }
    if (!confirm(`Remove cron job "${job.name}"? This cannot be undone.`)) return;
    setDeletingJobId(id);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          action: "delete",
          jobId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await loadJobs();
        toast.success("Cron job removed");
      } else {
        toast.error(data?.error || "Failed to remove job");
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
      toast.error((err as Error).message || "Failed to remove job");
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim() || "Unnamed job";
    const schedule = addSchedule.trim();
    const handler = addHandler.trim();
    if (!schedule || !handler) {
      toast.error("Schedule and handler are required");
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          action: "create",
          name,
          schedule,
          handler,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Job created");
        setAddOpen(false);
        setAddName("");
        setAddSchedule("");
        setAddHandler("");
        await loadJobs();
      } else {
        toast.error(data?.error || "Failed to create job");
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to create job");
    } finally {
      setAddSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorDisplay title="Failed to load jobs" message={error} />
        <Button type="button" onClick={() => loadJobs()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="w-3.5 h-3.5" />
          <code className="bg-muted/70 px-2 py-1 rounded">{dbPath}</code>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Prompt-based jobs run via Cursor CLI (<code>cursor</code>, <code>agent</code>, or <code>cursor-agent</code>). Ensure one is on the server PATH. For Telegram, set <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_CHAT_ID</code> in the server <code>.env</code> (runner loads it).
        </p>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleInstallRunner}
            disabled={installingRunner}
            title="Deploy runner so scheduled jobs run every minute"
          >
            <Download className="w-3 h-3 mr-1" />
            {installingRunner ? "Installing…" : "Install cron runner"}
          </Button>
        </div>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              No jobs configured in jobs.db. Add one below.
            </p>
            <form onSubmit={handleAddJob} className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="add-name">Name (optional)</Label>
                <Input
                  id="add-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Daily backup"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="add-schedule">Cron schedule</Label>
                <Input
                  id="add-schedule"
                  value={addSchedule}
                  onChange={(e) => setAddSchedule(e.target.value)}
                  placeholder="e.g. 0 8 * * *"
                  className="mt-1 font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">minute hour day month weekday</p>
              </div>
              <div>
                <Label htmlFor="add-handler">Handler (command or prompt)</Label>
                <Input
                  id="add-handler"
                  value={addHandler}
                  onChange={(e) => setAddHandler(e.target.value)}
                  placeholder="e.g. /usr/bin/my-script.sh or a natural-language prompt"
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Script path or prompt; prompts require Cursor CLI on the server PATH.
                </p>
              </div>
              <Button type="submit" disabled={addSubmitting}>
                {addSubmitting ? "Adding…" : "Add Job"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="w-3.5 h-3.5" />
        <code className="bg-muted/70 px-2 py-1 rounded">{dbPath}</code>
      </div>
      <p className="text-xs text-muted-foreground">
        Prompt-based jobs run via Cursor CLI (<code>cursor</code>, <code>agent</code>, or <code>cursor-agent</code>). Ensure one is on the server PATH or use a full path to a script (e.g. <code>/path/to/script.sh</code>).
      </p>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Scheduled Jobs{" "}
          <Badge variant="secondary" className="ml-2">
            {jobs.filter((j) => j.enabled).length}/{jobs.length} enabled
          </Badge>
        </h3>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => loadJobs()}>
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleInstallRunner}
            disabled={installingRunner}
            title="Deploy runner so jobs in jobs.db run on schedule via system cron"
          >
            <Download className="w-3 h-3 mr-1" />
            {installingRunner ? "Installing…" : "Install cron runner"}
          </Button>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Add Job
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id || job.name} className="bg-card-tint-2">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{job.name}</h4>
                      <Badge
                        variant={job.enabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {job.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
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
                        handleRunNow(job);
                      }}
                      disabled={runningJobId === (job.id || job.name)}
                      title="Run now"
                    >
                      {runningJobId === (job.id || job.name) ? (
                        <div className="w-3 h-3 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleJob(job)}
                      title={job.enabled ? "Disable" : "Enable"}
                    >
                      <Power className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteJob(job);
                      }}
                      disabled={deletingJobId === (job.id ?? job.name)}
                      title="Remove cron job"
                    >
                      {deletingJobId === (job.id ?? job.name) ? (
                        <div className="w-3 h-3 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Handler:</span>
                    <code className="block mt-1 bg-muted/50 px-2 py-1 rounded truncate">
                      {job.handler}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Runs:</span>
                    <span className="block mt-1 font-mono">
                      {job.run_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="block mt-1 font-mono text-destructive">
                      {job.error_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Run:</span>
                    <span className="block mt-1 font-mono">
                      {job.last_run || "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AddJobDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        addName={addName}
        setAddName={setAddName}
        addSchedule={addSchedule}
        setAddSchedule={setAddSchedule}
        addHandler={addHandler}
        setAddHandler={setAddHandler}
        addSubmitting={addSubmitting}
        onSubmit={handleAddJob}
      />
    </div>
  );
}

function AddJobDialog({
  open,
  onOpenChange,
  addName,
  setAddName,
  addSchedule,
  setAddSchedule,
  addHandler,
  setAddHandler,
  addSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addName: string;
  setAddName: (v: string) => void;
  addSchedule: string;
  setAddSchedule: (v: string) => void;
  addHandler: string;
  setAddHandler: (v: string) => void;
  addSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add cron job</DialogTitle>
          <DialogDescription>
            Add a job to jobs.db. Schedule uses cron format (minute hour day month weekday).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="dialog-name">Name (optional)</Label>
            <Input
              id="dialog-name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Daily backup"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="dialog-schedule">Cron schedule</Label>
            <Input
              id="dialog-schedule"
              value={addSchedule}
              onChange={(e) => setAddSchedule(e.target.value)}
              placeholder="e.g. 0 8 * * *"
              className="mt-1 font-mono"
              required
            />
          </div>
          <div>
            <Label htmlFor="dialog-handler">Handler (command or prompt)</Label>
            <Input
              id="dialog-handler"
              value={addHandler}
              onChange={(e) => setAddHandler(e.target.value)}
              placeholder="e.g. /usr/bin/my-script.sh or a natural-language prompt"
              className="mt-1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use a script path (e.g. <code>.sh</code>) or a prompt; prompts require Cursor CLI on the server PATH.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
