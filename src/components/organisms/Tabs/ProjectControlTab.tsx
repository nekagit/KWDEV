"use client";

/** Project Control Tab component. */
import { useState, useCallback, useEffect } from "react";
import { ClipboardList, Loader2, FileText, Flag, Lightbulb, CheckCircle2, XCircle, Archive } from "lucide-react";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { debugIngest } from "@/lib/debug-ingest";
import { cn } from "@/lib/utils";
import { invoke, isTauri, projectIdArgPayload } from "@/lib/tauri";
import { getIdeasList } from "@/lib/api-ideas";
import {
  fetchImplementationLogEntries,
  type ImplementationLogEntry,
} from "@/lib/fetch-implementation-log";
import { fetchProjectMilestones } from "@/lib/fetch-project-milestones";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type LogEntryStatus = "pending" | "accepted" | "declined";

interface ProjectControlTabProps {
  projectId: string;
  /** When this changes, the tab reloads implementation log (e.g. after a run completes). */
  refreshKey?: number;
}

export function ProjectControlTab({ projectId, refreshKey = 0 }: ProjectControlTabProps) {
  const [entries, setEntries] = useState<ImplementationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Record<number, string>>({});
  const [ideas, setIdeas] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      if (isTauri) {
        // #region agent log
        invoke("frontend_debug_log", { location: "ProjectControlTab.tsx:load", message: "Control: about to invoke get_implementation_log_entries", data: { projectId } }).catch(() => {});
        // #endregion
      }
      const list = await fetchImplementationLogEntries(projectId);
      setEntries(list);

      const [milList, ideaList] = await Promise.all([
        fetchProjectMilestones(projectId),
        getIdeasList(projectId),
      ]);
      const milMap: Record<number, string> = {};
      milList.forEach((m) => { milMap[m.id] = m.name; });
      const ideaMap: Record<number, string> = {};
      ideaList.forEach((i) => { ideaMap[i.id] = i.title; });
      setMilestones(milMap);
      setIdeas(ideaMap);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg);
      setEntries([]);
      // #region agent log
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectControlTab.tsx:load:catch", message: "Control: get_implementation_log_entries failed", data: { error: errMsg, projectId } }).catch(() => {});
      }
      debugIngest({ location: "ProjectControlTab.tsx:load:catch", message: "Control load failed", data: { error: errMsg, command: "get_implementation_log_entries" }, timestamp: Date.now(), hypothesisId: "ControlTab" });
      // #endregion
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const setEntryStatus = useCallback(
    async (entryId: number, status: LogEntryStatus) => {
      try {
        if (isTauri) {
          await invoke("update_implementation_log_entry_status", {
            projectId,
            entryId,
            status,
          });
        } else {
          const res = await fetch(
            `/api/data/projects/${projectId}/implementation-log/${entryId}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }
          );
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(typeof err.error === "string" ? err.error : "Failed to update");
          }
        }
        setEntries((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, status } : e))
        );
        toast.success(status === "accepted" ? "Entry accepted." : "Entry declined.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update entry");
      }
    },
    [projectId]
  );

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive shadow-sm">
        {error}
      </div>
    );
  }

  const pendingEntries = entries.filter((e) => e.status !== "accepted");
  const acceptedEntries = entries.filter((e) => e.status === "accepted");

  const isSessionEntry = (e: ImplementationLogEntry) => e.ticket_number === 0;

  const renderEntryCard = (entry: ImplementationLogEntry, showAcceptDecline: boolean) => (
    <div
      key={entry.id}
      className={cn(
        "surface-card rounded-xl border border-border/50 p-4 space-y-3",
        isSessionEntry(entry) && "border-sky-500/30 bg-sky-500/5"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">
          {isSessionEntry(entry) ? entry.ticket_title : `Ticket #${entry.ticket_number}: ${entry.ticket_title}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(entry.completed_at).toLocaleString()}
        </span>
        {entry.status === "accepted" && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-sky-500/15 text-sky-600 border border-sky-500/30">
            <CheckCircle2 className="size-3" />
            Accepted
          </span>
        )}
        {entry.status === "declined" && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/15 text-red-600 border border-red-500/30">
            <XCircle className="size-3" />
            Declined
          </span>
        )}
        {showAcceptDecline && !isSessionEntry(entry) && (entry.status === "pending" || !entry.status) && (
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1 bg-sky-500/10 border-sky-500/30 text-sky-600 hover:bg-sky-500/20"
              onClick={() => setEntryStatus(entry.id, "accepted")}
            >
              <CheckCircle2 className="size-3" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1 bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/20"
              onClick={() => setEntryStatus(entry.id, "declined")}
            >
              <XCircle className="size-3" />
              Decline
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Flag className="size-3" />
          {entry.milestone_id != null && milestones[entry.milestone_id] != null
            ? milestones[entry.milestone_id]
            : entry.milestone_id != null
              ? `Milestone ${entry.milestone_id}`
              : "—"}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Lightbulb className="size-3" />
          {entry.idea_id != null && ideas[entry.idea_id] != null
            ? ideas[entry.idea_id]
            : entry.idea_id != null
              ? `Idea ${entry.idea_id}`
              : "—"}
        </span>
      </div>
      {entry.files_changed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.files_changed.slice(0, 20).map((f, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono",
                f.status === "A" && "bg-sky-500/10 text-sky-600 border border-sky-500/20",
                f.status === "M" && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                f.status === "D" && "bg-red-500/10 text-red-600 border border-red-500/20",
                !["A", "M", "D"].includes(f.status) && "bg-muted/50 text-muted-foreground"
              )}
            >
              {f.status === "A" ? "Added" : f.status === "M" ? "Modified" : f.status === "D" ? "Deleted" : f.status} {f.path}
            </span>
          ))}
          {entry.files_changed.length > 20 && (
            <span className="text-xs text-muted-foreground">
              +{entry.files_changed.length - 20} more
            </span>
          )}
        </div>
      )}
      {entry.summary && (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <FileText className="size-4 shrink-0 mt-0.5" />
          <p className="line-clamp-3">{entry.summary}</p>
        </div>
      )}
    </div>
  );

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-6 text-muted-foreground" />}
        title="No completed implementations yet"
        description="Run Implement All for tickets; finished runs will appear here."
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Completed ticket runs (newest first). Accept moves an entry to Archived below.
      </p>
      <ScrollArea className="flex-1 min-h-[300px] rounded-xl surface-card border border-border/50">
        <div className="p-4 space-y-4">
          {pendingEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No pending entries. Accepted entries are in Archived below.</p>
          ) : (
            pendingEntries.map((entry) => renderEntryCard(entry, true))
          )}
        </div>
      </ScrollArea>

      {acceptedEntries.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="archived" className="rounded-xl surface-card border border-border/50 overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
              <span className="flex items-center gap-2">
                <Archive className="size-4 text-muted-foreground" />
                <span className="font-medium">Archived</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({acceptedEntries.length} accepted)
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                {acceptedEntries.map((entry) => renderEntryCard(entry, false))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
