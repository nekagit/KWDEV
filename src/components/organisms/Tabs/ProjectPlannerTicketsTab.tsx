"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, RotateCcw, Trash2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/molecules/Displays/DisplayPrimitives";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { fetchProjectTicketsAndKanban } from "@/lib/fetch-project-tickets-and-kanban";
import type { ParsedTicket } from "@/lib/todos-kanban";
import { cn } from "@/lib/utils";

function formatStatus(ticket: ParsedTicket, inProgressIds: Set<string>): string {
  if (ticket.done || ticket.status === "Done") return "Done";
  if (inProgressIds.has(ticket.id)) return "In progress";
  return "Backlog";
}

function formatUpdatedAt(): string {
  return new Date().toLocaleDateString(undefined, { dateStyle: "short" });
}

interface ProjectPlannerTicketsTabProps {
  projectId: string;
}

export function ProjectPlannerTicketsTab({ projectId }: ProjectPlannerTicketsTabProps) {
  const [tickets, setTickets] = useState<ParsedTicket[]>([]);
  const [inProgressIds, setInProgressIds] = useState<string[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { tickets: list, inProgressIds: progress } = await fetchProjectTicketsAndKanban(projectId);
      setTickets(list);
      setInProgressIds(progress);
      setSelectedTicketId((prev) => (list.some((t) => t.id === prev) ? prev : (list[0]?.id ?? null)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tickets");
      setTickets([]);
      setInProgressIds([]);
      setSelectedTicketId(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const inProgressSet = useMemo(() => new Set(inProgressIds), [inProgressIds]);
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  const markDone = useCallback(async (ticketId: string) => {
    setBusyAction(ticketId);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true, status: "Done" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update ticket");
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, done: true, status: "Done" } : t)));
      toast.success("Ticket marked as done.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark done");
    } finally {
      setBusyAction(null);
    }
  }, [projectId]);

  const redoTicket = useCallback(async (ticketId: string) => {
    setBusyAction(ticketId);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: false, status: "Todo" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update ticket");
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, done: false, status: "Todo" } : t)));
      toast.success("Ticket moved back to backlog.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to redo ticket");
    } finally {
      setBusyAction(null);
    }
  }, [projectId]);

  const moveToInProgress = useCallback(async (ticketId: string) => {
    setBusyAction(ticketId);
    try {
      const nextIds = inProgressSet.has(ticketId) ? inProgressIds : [...inProgressIds, ticketId];
      const res = await fetch(`/api/data/projects/${projectId}/kanban-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inProgressIds: nextIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update kanban state");
      setInProgressIds(nextIds);
      toast.success("Ticket moved to In progress.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move ticket");
    } finally {
      setBusyAction(null);
    }
  }, [projectId, inProgressIds, inProgressSet]);

  const archiveTicket = useCallback(async (ticketId: string) => {
    setBusyAction(ticketId);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete ticket");
      const nextIds = inProgressIds.filter((id) => id !== ticketId);
      await fetch(`/api/data/projects/${projectId}/kanban-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inProgressIds: nextIds }),
      });
      setInProgressIds(nextIds);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setSelectedTicketId((prev) => (prev === ticketId ? null : prev));
      toast.success("Ticket archived.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive ticket");
    } finally {
      setBusyAction(null);
    }
  }, [projectId, inProgressIds]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading tickets…</span>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<Circle className="size-6 text-muted-foreground" />}
        title="No tickets yet"
        description="Create or generate a ticket in Planner Manager and it will appear here."
        action={
          <Button variant="outline" size="sm" onClick={() => void loadTickets()} className="gap-2">
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />
    );
  }

  const selectedIsDone = selectedTicket ? (selectedTicket.done || selectedTicket.status === "Done") : false;
  const selectedIsInProgress = selectedTicket ? inProgressSet.has(selectedTicket.id) : false;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-medium text-muted-foreground">Tickets ({tickets.length})</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => void loadTickets()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {selectedTicket && (
            <>
              {!selectedIsInProgress && !selectedIsDone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void moveToInProgress(selectedTicket.id)}
                  disabled={busyAction === selectedTicket.id}
                  className="gap-1.5"
                >
                  <Circle className="h-3.5 w-3.5" />
                  Move to in progress
                </Button>
              )}
              {!selectedIsDone ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void markDone(selectedTicket.id)}
                  disabled={busyAction === selectedTicket.id}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark done
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void redoTicket(selectedTicket.id)}
                  disabled={busyAction === selectedTicket.id}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Redo
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void archiveTicket(selectedTicket.id)}
                disabled={busyAction === selectedTicket.id}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {busyAction === selectedTicket.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <SectionCard accentColor="blue" tint={1} className="flex-1 min-h-0 flex flex-col">
        <p className="text-xs text-muted-foreground mb-3">
          Ticket entries synced with planner Kanban. Select a row, then use actions to update status.
        </p>
        <div className="rounded-md border border-border/60 overflow-hidden flex-1 min-h-0 flex flex-col">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell w-[100px]">Priority</TableHead>
                <TableHead className="hidden md:table-cell w-[120px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className={cn("cursor-pointer", selectedTicketId === ticket.id && "bg-muted/60")}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{ticket.number}</TableCell>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{ticket.priority}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {formatStatus(ticket, inProgressSet)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{formatUpdatedAt()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
