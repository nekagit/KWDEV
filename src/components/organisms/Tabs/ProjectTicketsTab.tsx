"use client";

/** Project Tickets Tab component. */
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { Form } from "@/components/molecules/Form/Form";
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";
import { FormField } from "@/components/molecules/Form/FormField";
import {
  Loader2,
  Plus,
  Ticket as TicketIcon,
  AlertCircle,
  Play,
  ChevronDown,
  Square,
  Eraser,
  Archive,
  Terminal,
  CheckCircle2,
  Circle,
  Trash,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types/project";
import { listProjectFiles } from "@/lib/api-projects";
import { AGENTS_ROOT } from "@/lib/cursor-paths";
import { invoke, isTauri, projectIdArgPayload, projectIdArgOptionalPayload } from "@/lib/tauri";
import { getIdeasList } from "@/lib/api-ideas";
import { fetchProjectMilestones } from "@/lib/fetch-project-milestones";
import { useRunStore, registerRunCompleteHandler } from "@/store/run-store";
import { fetchProjectTicketsAndKanban } from "@/lib/fetch-project-tickets-and-kanban";
import {
  buildKanbanFromTickets,
  applyInProgressState,
  type TodosKanbanData,
  type ParsedTicket,
} from "@/lib/todos-kanban";
import {
  buildKanbanContextBlock,
  combinePromptRecordWithKanban,
} from "@/lib/kanban-prompt-blocks";
import { EmptyState, LoadingState } from "@/components/molecules/Display/EmptyState";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { KanbanColumnCard } from "@/components/organisms/Kanban/KanbanColumnCard";
import { cn, humanizeAgentId } from "@/lib/utils";
import { isImplementAllRun } from "@/lib/run-helpers";
import { MAX_TERMINAL_SLOTS } from "@/types/run";
import { AddPromptDialog } from "@/components/molecules/FormsAndDialogs/AddPromptDialog";
import { TerminalSlot } from "@/components/molecules/Display/TerminalSlot";
import { extractTicketJsonFromStdout } from "@/lib/ticket-parsing";

const PRIORITIES: Array<"P0" | "P1" | "P2" | "P3"> = ["P0", "P1", "P2", "P3"];

/** Agent ids to never auto-assign to generated tickets (e.g. devops, requirements). */
const EXCLUDED_AGENT_IDS = ["devops", "requirements"];

/** Horizontal scroll of terminal slots. Runs are placed by slot (1 → first terminal, 2 → second, etc.). */
export function ImplementAllTerminalsGrid() {
  const runningRuns = useRunStore((s) => s.runningRuns);
  const implementAllRuns = runningRuns.filter(isImplementAllRun);
  const runsForSlots: ((typeof implementAllRuns)[0] | null)[] = Array.from(
    { length: MAX_TERMINAL_SLOTS },
    () => null
  );
  for (const run of implementAllRuns) {
    const s = run.slot;
    if (s == null || s < 1 || s > MAX_TERMINAL_SLOTS) continue;
    const idx = s - 1;
    const existing = runsForSlots[idx];
    const preferThis =
      !existing || (run.status === "running" && existing.status !== "running");
    if (preferThis) runsForSlots[idx] = run;
  }
  return (
    <div className="overflow-x-auto overflow-y-hidden scroll-smooth pb-2 min-h-0">
      <div className="flex gap-4 flex-nowrap w-max">
        {runsForSlots.map((run, i) => (
          <div key={run ? `run-${run.runId}` : `slot-${i}`} className="flex-[0_0_360px] min-w-[360px] w-[360px]">
            <TerminalSlot run={run} slotIndex={i} heightClass="h-[40vh]" showDots={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* formatElapsed is now imported from @/lib/run-helpers */

/* ═══════════════════════════════════════════════════════ */
/*  ImplementAllToolbar                                   */
/* ═══════════════════════════════════════════════════════ */

export function ImplementAllToolbar({
  projectPath,
  kanbanData,
}: {
  projectPath: string;
  kanbanData: TodosKanbanData | null;
}) {
  const runImplementAll = useRunStore((s) => s.runImplementAll);
  const stopAllImplementAll = useRunStore((s) => s.stopAllImplementAll);
  const clearImplementAllLogs = useRunStore((s) => s.clearImplementAllLogs);
  const archiveImplementAllLogs = useRunStore(
    (s) => s.archiveImplementAllLogs
  );
  const runningRuns = useRunStore((s) => s.runningRuns);
  const prompts = useRunStore((s) => s.prompts);
  const [loading, setLoading] = useState(false);
  const [addPromptOpen, setAddPromptOpen] = useState<"self" | "ai" | null>(
    null
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(
    null
  );

  const implementAllRuns = runningRuns.filter(isImplementAllRun);
  const anyRunning = implementAllRuns.some((r) => r.status === "running");

  const handleImplementAll = async () => {
    const prompt =
      selectedPromptId != null
        ? prompts.find((p) => String(p.id) === selectedPromptId)
        : null;
    const userPrompt = prompt?.content?.trim() ?? "";
    const kanbanContext = kanbanData
      ? buildKanbanContextBlock(kanbanData)
      : "";
    const combinedPrompt = combinePromptRecordWithKanban(
      kanbanContext,
      userPrompt
    );
    const promptContent = combinedPrompt.trim() || undefined;
    setLoading(true);
    try {
      await runImplementAll(projectPath, promptContent);
      toast.success(
        promptContent
          ? "Implement All started (selected prompt + ticket info). Check the terminals below."
          : "Implement All started. For interactive agent (no prompt), use Open in system terminal."
      );
    } catch {
      toast.error("Failed to start Implement All");
    } finally {
      setLoading(false);
    }
  };

  const handleStopAll = async () => {
    try {
      await stopAllImplementAll();
      toast.success("All terminals stopped. Logs kept.");
    } catch {
      toast.error("Failed to stop");
    }
  };

  const handleOpenInSystemTerminal = async () => {
    try {
      await invoke("open_implement_all_in_system_terminal", { projectPath });
      toast.success(
        "Opened 3 Terminal.app windows with agent (interactive, like your MacBook)."
      );
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary actions */}
      <Button
        variant="default"
        size="sm"
        onClick={handleOpenInSystemTerminal}
        className="gap-1.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-sm"
      >
        <Terminal className="size-3.5" />
        System terminal
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleImplementAll}
        disabled={loading}
        className="gap-1.5 bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 shadow-sm"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Play className="size-3.5" />
        )}
        Implement All
      </Button>

      {/* Prompt selector */}
      <Select
        value={selectedPromptId ?? ""}
        onValueChange={(v) => setSelectedPromptId(v || null)}
      >
        <SelectTrigger
          className="w-[180px] h-8 text-xs border-border/50 bg-muted/30"
          aria-label="Select one prompt"
        >
          <SelectValue placeholder="Select prompt" />
        </SelectTrigger>
        <SelectContent>
          {prompts.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.title || `Prompt ${p.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-8"
          >
            <Plus className="size-3" />
            Prompt
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setAddPromptOpen("self")}>
            Self-written prompt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAddPromptOpen("ai")}>
            AI generation prompt
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Destructive actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStopAll}
          disabled={!anyRunning}
          className="gap-1 text-xs h-8 text-destructive hover:bg-destructive/10"
        >
          <Square className="size-3" />
          Stop
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearImplementAllLogs}
          className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          <Eraser className="size-3" />
          Clear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={archiveImplementAllLogs}
          className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
        >
          <Archive className="size-3" />
          Archive
        </Button>
      </div>

      <AddPromptDialog open={addPromptOpen} onOpenChange={setAddPromptOpen} />
    </div>
  );
}

/* AddPromptDialog is now imported from @/components/molecules/FormsAndDialogs/AddPromptDialog */

/* ═══════════════════════════════════════════════════════ */
/*  ProjectTicketsTab (main component)                    */
/* ═══════════════════════════════════════════════════════ */

interface ProjectTicketsTabProps {
  project: Project;
  projectId: string;
  fetchProject: () => Promise<void>;
}

export function ProjectTicketsTab({
  project,
  projectId,
  fetchProject,
}: ProjectTicketsTabProps) {
  const [kanbanData, setKanbanData] = useState<TodosKanbanData | null>(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [addTicketOpen, setAddTicketOpen] = useState(false);
  const [addTicketTitle, setAddTicketTitle] = useState("");
  const [addTicketDesc, setAddTicketDesc] = useState("");
  const [addTicketPriority, setAddTicketPriority] = useState<
    "P0" | "P1" | "P2" | "P3"
  >("P1");
  const [addTicketFeature, setAddTicketFeature] = useState("");
  const [addTicketMilestoneId, setAddTicketMilestoneId] = useState<number | null>(null);
  const [addTicketIdeaId, setAddTicketIdeaId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [milestones, setMilestones] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [ideas, setIdeas] = useState<{ id: number; title: string }[]>([]);
  /* Planner Manager: AI-generated ticket from prompt */
  // Removed plannerManagerMode, always default to ticket
  const [plannerPromptInput, setPlannerPromptInput] = useState("");
  const [generatedTicket, setGeneratedTicket] = useState<{
    title: string;
    description?: string;
    priority: "P0" | "P1" | "P2" | "P3";
    featureName: string;
  } | null>(null);
  /** When a ticket is generated, we assign all agents from AGENTS_ROOT (.cursor/2. agents); stored here for display and for newTicket.agents. */
  const [assignedAgentsForGenerated, setAssignedAgentsForGenerated] = useState<string[]>([]);
  const [generatingTicket, setGeneratingTicket] = useState(false);
  const [generatedTicketMilestoneId, setGeneratedTicketMilestoneId] = useState<number | null>(null);
  const [generatedTicketIdeaId, setGeneratedTicketIdeaId] = useState<number | null>(null);

  /* ── Data loading ── */

  const loadTicketsAndKanban = useCallback(async () => {
    if (!projectId) return;
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      const { tickets, inProgressIds } = await fetchProjectTicketsAndKanban(projectId);
      const data = buildKanbanFromTickets(tickets, inProgressIds);
      setKanbanData(data);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setKanbanError(errMsg);
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectTicketsTab.tsx:loadTicketsAndKanban:catch", message: "Planner: loadTicketsAndKanban failed", data: { error: errMsg, projectId } }).catch(() => {});
      }
    } finally {
      setKanbanLoading(false);
    }
  }, [projectId]);

  const loadMilestonesAndIdeas = useCallback(async () => {
    if (!projectId) return;
    try {
      const [milestonesList, allIdeas] = await Promise.all([
        fetchProjectMilestones(projectId),
        getIdeasList(projectId),
      ]);
      const ideaIds = Array.isArray(project?.ideaIds) ? project.ideaIds : [];
      let ideasList = ideaIds.length > 0 ? allIdeas.filter((i) => ideaIds.includes(i.id)) : allIdeas;
      const generalDevIdea = allIdeas.find((i) => i.title === "General Development");
      if (generalDevIdea && !ideasList.some((i) => i.id === generalDevIdea.id)) {
        ideasList = [...ideasList, generalDevIdea];
      }
      setMilestones(milestonesList);
      setIdeas(ideasList);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setMilestones([]);
      setIdeas([]);
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectTicketsTab.tsx:loadMilestonesAndIdeas:catch", message: "Planner: loadMilestonesAndIdeas failed", data: { error: errMsg, projectId } }).catch(() => {});
      }
    }
  }, [projectId, project?.ideaIds]);

  /* ── Ticket / Feature mutations ── */

  const handleMarkDone = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      try {
        const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: true, status: "Done" }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        const inProgressIds = kanbanData.columns.in_progress?.items.map((t) => t.id) ?? [];
        const updatedTickets = kanbanData.tickets.map((t) =>
          t.id === ticketId ? { ...t, done: true, status: "Done" as const } : t
        );
        setKanbanData(applyInProgressState({ ...kanbanData, tickets: updatedTickets }, inProgressIds));
        toast.success("Ticket marked as done.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [projectId, kanbanData]
  );

  const handleRedo = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      try {
        const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: false, status: "Todo" }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        const inProgressIds = kanbanData.columns.in_progress?.items.map((t) => t.id) ?? [];
        const updatedTickets = kanbanData.tickets.map((t) =>
          t.id === ticketId ? { ...t, done: false, status: "Todo" as const } : t
        );
        setKanbanData(applyInProgressState({ ...kanbanData, tickets: updatedTickets }, inProgressIds));
        toast.success("Ticket moved back to todo.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [projectId, kanbanData]
  );

  const handleArchive = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      const ticket = kanbanData.tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      try {
        const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
        const inProgressIds = (kanbanData.columns.in_progress?.items.map((t) => t.id) ?? []).filter((id) => id !== ticketId);
        await fetch(`/api/data/projects/${projectId}/kanban-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inProgressIds }),
        });
        const updatedTickets = kanbanData.tickets.filter((t) => t.id !== ticketId);
        setKanbanData(applyInProgressState({ ...kanbanData, tickets: updatedTickets }, inProgressIds));
        toast.success(`Ticket #${ticket.number} archived.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [projectId, kanbanData]
  );

  const handleMoveToInProgress = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      const inProgressColumn = kanbanData.columns.in_progress;
      const currentIds = inProgressColumn ? inProgressColumn.items.map((t) => t.id) : [];
      if (currentIds.includes(ticketId)) return;
      const newIds = [...currentIds, ticketId];
      try {
        const res = await fetch(`/api/data/projects/${projectId}/kanban-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inProgressIds: newIds }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        setKanbanData(applyInProgressState(kanbanData, newIds));
        toast.success("Ticket moved to In progress.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [projectId, kanbanData]
  );

  const handleAddTicket = useCallback(async () => {
    if (!addTicketTitle.trim()) return;
    if (addTicketMilestoneId == null || addTicketIdeaId == null) {
      toast.error("Please select a Milestone and an Idea.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTicketTitle.trim(),
          description: addTicketDesc.trim() || undefined,
          priority: addTicketPriority,
          feature_name: addTicketFeature.trim() || "General",
          milestone_id: addTicketMilestoneId,
          idea_id: addTicketIdeaId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create ticket");
      }
      const newTicket = (await res.json()) as { id: string; number: number; title: string; description?: string; priority: string; feature_name: string; done: number; status: string; milestone_id: number; idea_id: number; agents?: string[] };
      const parsed: ParsedTicket = {
        id: newTicket.id,
        number: newTicket.number,
        title: newTicket.title,
        description: newTicket.description,
        priority: (newTicket.priority as ParsedTicket["priority"]) || "P1",
        featureName: newTicket.feature_name || "General",
        done: newTicket.done === 1,
        status: (newTicket.status as ParsedTicket["status"]) || "Todo",
        agents: newTicket.agents,
        milestoneId: newTicket.milestone_id,
        ideaId: newTicket.idea_id,
      };
      const inProgressIds = kanbanData?.columns.in_progress?.items.map((t) => t.id) ?? [];
      const updatedTickets = [...(kanbanData?.tickets ?? []), parsed];
      setKanbanData(buildKanbanFromTickets(updatedTickets, inProgressIds));
      setAddTicketOpen(false);
      setAddTicketTitle("");
      setAddTicketDesc("");
      setAddTicketFeature("");
      setAddTicketMilestoneId(null);
      setAddTicketIdeaId(null);
      toast.success(`Ticket #${newTicket.number} added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [
    projectId,
    kanbanData,
    addTicketTitle,
    addTicketDesc,
    addTicketPriority,
    addTicketFeature,
    addTicketMilestoneId,
    addTicketIdeaId,
  ]);

  const handleRemoveAllTickets = useCallback(async () => {
    if (!kanbanData) return;
    if (
      !confirm(
        "Are you sure you want to remove ALL tickets? This cannot be undone."
      )
    )
      return;

    setSaving(true);
    try {
      await Promise.all(
        kanbanData.tickets.map((t) =>
          fetch(`/api/data/projects/${projectId}/tickets/${t.id}`, { method: "DELETE" })
        )
      );
      await fetch(`/api/data/projects/${projectId}/kanban-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inProgressIds: [] }),
      });
      setKanbanData(buildKanbanFromTickets([], []));
      toast.success("All tickets removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [projectId, kanbanData]);

  const runTempTicket = useRunStore((s) => s.runTempTicket);

  const generateTicketFromPrompt = useCallback(async () => {
    const prompt = plannerPromptInput.trim();
    if (!prompt) {
      toast.error("Enter a short description (e.g. “I want a new page with settings”).");
      return;
    }
    if (!project?.repoPath?.trim()) {
      toast.error("Project repo path is required");
      return;
    }
    setGeneratingTicket(true);
    setGeneratedTicket(null);
    setAssignedAgentsForGenerated([]);
    try {
      const existingFeatures: string[] = [];
      if (isTauri) {
        const res = await fetch("/api/generate-ticket-from-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, existingFeatures, projectPath: project.repoPath, promptOnly: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to generate ticket");
          return;
        }
        const promptText = data.prompt;
        if (!promptText) {
          toast.error("No prompt returned");
          return;
        }
        registerRunCompleteHandler(`parse_ticket:${projectId}`, (stdout: string) => {
          const parsed = extractTicketJsonFromStdout(stdout);
          const priority = parsed?.priority && ["P0", "P1", "P2", "P3"].includes(parsed.priority) ? parsed.priority : "P1";
          if (parsed && (parsed.title != null || parsed.description != null)) {
            setGeneratedTicket({
              title: String(parsed.title ?? prompt.slice(0, 80)).trim().slice(0, 200),
              description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 2000) : undefined,
              priority: priority as "P0" | "P1" | "P2" | "P3",
              featureName: String(parsed.featureName ?? "Uncategorized").trim().slice(0, 100),
            });
          } else {
            // Fallback: use prompt as ticket so user can still add to backlog (DB)
            setGeneratedTicket({
              title: prompt.trim().slice(0, 200) || "New ticket",
              description: prompt.trim().slice(0, 2000) || undefined,
              priority: priority as "P0" | "P1" | "P2" | "P3",
              featureName: "Uncategorized",
            });
            toast.info("Could not parse agent output. Use the ticket below (from your description), pick Milestone and Idea, then add to backlog.");
          }
          setGeneratingTicket(false);
        });
        await runTempTicket(project.repoPath.trim(), promptText, "Generate ticket", {
          onComplete: "parse_ticket",
          payload: { projectId },
        });
        toast.success("Generate ticket running in Run tab.");
        return;
      }
      const res = await fetch("/api/generate-ticket-from-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, existingFeatures }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate ticket");
        return;
      }
      setGeneratedTicket({
        title: data.title,
        description: data.description,
        priority: data.priority ?? "P1",
        featureName: data.featureName ?? "Uncategorized",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGeneratingTicket(false);
    }
  }, [plannerPromptInput, project, projectId, runTempTicket]);

  const confirmAddGeneratedTicketToBacklog = useCallback(async () => {
    if (!generatedTicket) return;
    if (generatedTicketMilestoneId == null || generatedTicketIdeaId == null) {
      toast.error("Please select a Milestone and an Idea for this ticket.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedTicket.title,
          description: generatedTicket.description,
          priority: generatedTicket.priority,
          feature_name: generatedTicket.featureName.trim() || "General",
          milestone_id: generatedTicketMilestoneId,
          idea_id: generatedTicketIdeaId,
          agents: assignedAgentsForGenerated.length > 0 ? assignedAgentsForGenerated : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create ticket");
      }
      const newTicket = (await res.json()) as { id: string; number: number; title: string; description?: string; priority: string; feature_name: string; done: number; status: string; milestone_id: number; idea_id: number; agents?: string[] };
      const parsed: ParsedTicket = {
        id: newTicket.id,
        number: newTicket.number,
        title: newTicket.title,
        description: newTicket.description,
        priority: (newTicket.priority as ParsedTicket["priority"]) || "P1",
        featureName: newTicket.feature_name || "General",
        done: false,
        status: "Todo",
        agents: newTicket.agents,
        milestoneId: newTicket.milestone_id,
        ideaId: newTicket.idea_id,
      };
      const inProgressIds = kanbanData?.columns.in_progress?.items.map((t) => t.id) ?? [];
      const updatedTickets = [parsed, ...(kanbanData?.tickets ?? [])];
      setKanbanData(buildKanbanFromTickets(updatedTickets, inProgressIds));
      setGeneratedTicket(null);
      setAssignedAgentsForGenerated([]);
      setGeneratedTicketMilestoneId(null);
      setGeneratedTicketIdeaId(null);
      setPlannerPromptInput("");
      toast.success(`Ticket #${newTicket.number} added to backlog.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [projectId, kanbanData, generatedTicket, assignedAgentsForGenerated, generatedTicketMilestoneId, generatedTicketIdeaId]);

  /** When a ticket is generated, assign all agents from AGENTS_ROOT (.md files). */
  useEffect(() => {
    if (!generatedTicket) {
      setAssignedAgentsForGenerated([]);
      return;
    }
    if (!project?.repoPath) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listProjectFiles(projectId, AGENTS_ROOT, project.repoPath);
        const mdFiles = list.filter((e) => !e.isDirectory && e.name.toLowerCase().endsWith(".md"));
        const excluded = new Set(EXCLUDED_AGENT_IDS.map((x) => x.toLowerCase()));
        const ids = mdFiles
          .map((e) => e.name.replace(/\.md$/i, ""))
          .filter((id) => !excluded.has(id.toLowerCase()));
        if (!cancelled) setAssignedAgentsForGenerated(ids);
      } catch {
        if (!cancelled) setAssignedAgentsForGenerated([]);
      }
    })();
    return () => { cancelled = true; };
  }, [generatedTicket, project?.repoPath, projectId]);

  /** Default generated-ticket milestone/idea to "General Development" when lists load. */
  useEffect(() => {
    if (!generatedTicket) return;
    const gdMilestoneId = milestones.find((m) => m.name === "General Development")?.id ?? null;
    const gdIdeaId = ideas.find((i) => i.title === "General Development")?.id ?? null;
    setGeneratedTicketMilestoneId((prev) => (prev == null ? gdMilestoneId : prev));
    setGeneratedTicketIdeaId((prev) => (prev == null ? gdIdeaId : prev));
  }, [generatedTicket, milestones, ideas]);

  const addTicketOpenPrevRef = useRef(false);
  /** When Add ticket dialog opens, default milestone/idea to "General Development" if null. */
  useEffect(() => {
    if (addTicketOpen && !addTicketOpenPrevRef.current) {
      addTicketOpenPrevRef.current = true;
      const gdMilestoneId = milestones.find((m) => m.name === "General Development")?.id ?? null;
      const gdIdeaId = ideas.find((i) => i.title === "General Development")?.id ?? null;
      setAddTicketMilestoneId((prev) => prev ?? gdMilestoneId);
      setAddTicketIdeaId((prev) => prev ?? gdIdeaId);
    }
    if (!addTicketOpen) addTicketOpenPrevRef.current = false;
  }, [addTicketOpen, milestones, ideas]);

  useEffect(() => {
    if (projectId) {
      loadTicketsAndKanban();
      loadMilestonesAndIdeas();
    }
  }, [projectId, loadTicketsAndKanban, loadMilestonesAndIdeas]);

  /* ═══════════════ RENDER ═══════════════ */

  // Compute stats for the summary bar
  const totalTickets = kanbanData?.tickets.length ?? 0;
  const doneTickets = kanbanData?.tickets.filter((t) => t.done).length ?? 0;
  const progressPercent = totalTickets > 0 ? Math.round((doneTickets / totalTickets) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Loading / error ── */}
      {kanbanLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingState />
        </div>
      ) : kanbanError ? (
        <ErrorDisplay message={kanbanError} />
      ) : !kanbanData ? null : (
        <>
          {/* ═══════ Planner Manager (top, expanded by default) ═══════ */}
          <Accordion type="single" collapsible defaultValue="planner-manager" className="w-full">
            <AccordionItem value="planner-manager" className="border-none">
              <AccordionTrigger className="hover:no-underline py-0">
                <div className="flex flex-col items-start text-left gap-1">
                  <h2 className="text-xl font-bold tracking-tight">Planner Manager</h2>
                  <p className="text-sm text-muted-foreground font-normal">
                    Describe what you want; AI generates a ticket. Confirm to add to backlog.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-6">
                <div className="w-full flex flex-col gap-4">

                  {/* Same input + textarea + magic stick for Ticket */}
                  <div className="grid gap-2">
                    <label htmlFor="planner-prompt-input" className="text-sm font-medium text-muted-foreground">
                      What do you want?
                    </label>
                    <input
                      id="planner-prompt-input"
                      type="text"
                      placeholder="e.g. A new page with settings"
                      value={plannerPromptInput}
                      onChange={(e) => setPlannerPromptInput(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      tabIndex={0}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={generateTicketFromPrompt}
                      disabled={generatingTicket || !kanbanData}
                      className="gap-2"
                      tabIndex={0}
                    >
                      {generatingTicket ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Wand2 className="size-4" />
                      )}
                      Generate ticket
                    </Button>
                  </div>

                  {/* Ticket: confirm generated ticket → select milestone + idea → add to backlog at top */}
                  {generatedTicket && (
                    <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Generated ticket — select Milestone & Idea, then add to top of backlog</p>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Title:</span> {generatedTicket.title}</p>
                        {generatedTicket.description && (
                          <p><span className="font-medium">Description:</span> {generatedTicket.description}</p>
                        )}
                        <p><span className="font-medium">Priority:</span> {generatedTicket.priority} · <span className="font-medium">Feature:</span> {generatedTicket.featureName}</p>
                        {assignedAgentsForGenerated.length > 0 ? (
                          <p><span className="font-medium">Assigned agents:</span>{" "}
                            {assignedAgentsForGenerated.map((id) => (
                              <span key={id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-600 border border-violet-500/20 mr-1 mb-1">{humanizeAgentId(id)}</span>
                            ))}
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-xs">No agents (add .md files to {AGENTS_ROOT} to assign)</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField label="Milestone (required)" htmlFor="gen-ticket-milestone">
                          <Select
                            value={generatedTicketMilestoneId != null ? String(generatedTicketMilestoneId) : ""}
                            onValueChange={(v) => setGeneratedTicketMilestoneId(v ? Number(v) : null)}
                          >
                            <SelectTrigger id="gen-ticket-milestone">
                              <SelectValue placeholder="Select milestone" />
                            </SelectTrigger>
                            <SelectContent>
                              {milestones.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Idea (required)" htmlFor="gen-ticket-idea">
                          <Select
                            value={generatedTicketIdeaId != null ? String(generatedTicketIdeaId) : ""}
                            onValueChange={(v) => setGeneratedTicketIdeaId(v ? Number(v) : null)}
                          >
                            <SelectTrigger id="gen-ticket-idea">
                              <SelectValue placeholder="Select idea" />
                            </SelectTrigger>
                            <SelectContent>
                              {ideas.map((i) => (
                                <SelectItem key={i.id} value={String(i.id)}>{i.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                      <ButtonGroup alignment="left">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGeneratedTicket(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={confirmAddGeneratedTicketToBacklog}
                          disabled={saving || generatedTicketMilestoneId == null || generatedTicketIdeaId == null}
                        >
                          {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                          Confirm & add to backlog
                        </Button>
                      </ButtonGroup>
                    </div>
                  )}

                  {/* Bulk actions */}
                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash className="size-4" />
                          <span className="hidden sm:inline">Bulk Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={handleRemoveAllTickets}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="size-4 mr-2" />
                          Remove all tickets
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* ═══════ Project Planner (stats + Kanban) ═══════ */}
          <Accordion type="single" collapsible defaultValue="planner-stats" className="w-full">
            <AccordionItem value="planner-stats" className="border-none">
              <AccordionTrigger className="hover:no-underline py-0">
                <div className="flex flex-col items-start text-left gap-1">
                  <h2 className="text-xl font-bold tracking-tight">Project Planner</h2>
                  <p className="text-sm text-muted-foreground font-normal">
                    Manage tickets and progress.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-6">
                <div className="flex flex-col gap-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-border/40 bg-card backdrop-blur-sm p-4 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TicketIcon className="size-8" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total Tickets
                      </span>
                      <span className="text-2xl font-bold tabular-nums">
                        {totalTickets}
                      </span>
                    </div>

                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-sm p-4 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 text-blue-500 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Circle className="size-8" />
                      </div>
                      <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                        Open
                      </span>
                      <span className="text-2xl font-bold text-blue-500 tabular-nums">
                        {totalTickets - doneTickets}
                      </span>
                    </div>

                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 backdrop-blur-sm p-4 flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 text-sky-500 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 className="size-8" />
                      </div>
                      <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">
                        Completed
                      </span>
                      <span className="text-2xl font-bold text-sky-500 tabular-nums">
                        {doneTickets}
                      </span>
                    </div>
                  </div>

                  {/* Overall Progress */}
                  {totalTickets > 0 && (
                    <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-4">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        Overall Progress
                      </span>
                      <div className="h-3 flex-1 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold tabular-nums">
                        {progressPercent}%
                      </span>
                    </div>
                  )}

                  {/* Kanban Board */}
                  <div data-testid="kanban-columns-grid">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const kanbanColumnOrder = [
                          "backlog",
                          "in_progress",
                          "done",
                        ] as const;
                        return kanbanColumnOrder.map((columnId) => {
                          const column = kanbanData.columns[columnId];
                          if (!column) return null;
                          return (
                            <KanbanColumnCard
                              key={columnId}
                              columnId={columnId}
                              column={column}
                              projectId={projectId}
                              handleMarkDone={handleMarkDone}
                              handleRedo={handleRedo}
                              handleArchive={handleArchive}
                              handleMoveToInProgress={handleMoveToInProgress}
                            />
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}

      {/* ═══════ Add Ticket Dialog ═══════ */}
      <SharedDialog
        isOpen={addTicketOpen}
        title="Add ticket"
        onClose={() => setAddTicketOpen(false)}
        actions={
          <ButtonGroup alignment="right">
            <Button
              variant="outline"
              onClick={() => setAddTicketOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTicket}
              disabled={saving || !addTicketTitle.trim() || addTicketMilestoneId == null || addTicketIdeaId == null}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Add
            </Button>
          </ButtonGroup>
        }
      >
          <Form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTicket();
          }}
        >
          <GenericInputWithLabel
            id="ticket-title"
            label="Title"
            value={addTicketTitle}
            onChange={(e) => setAddTicketTitle(e.target.value)}
            placeholder="Ticket title"
          />
          <GenericInputWithLabel
            id="ticket-desc"
            label="Description (optional)"
            value={addTicketDesc}
            onChange={(e) => setAddTicketDesc(e.target.value)}
            placeholder="Short description"
          />
          <FormField htmlFor="ticket-milestone" label="Milestone (required)">
            <Select
              value={addTicketMilestoneId != null ? String(addTicketMilestoneId) : ""}
              onValueChange={(v) => setAddTicketMilestoneId(v ? Number(v) : null)}
            >
              <SelectTrigger id="ticket-milestone">
                <SelectValue placeholder="Select milestone" />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField htmlFor="ticket-idea" label="Idea (required)">
            <Select
              value={addTicketIdeaId != null ? String(addTicketIdeaId) : ""}
              onValueChange={(v) => setAddTicketIdeaId(v ? Number(v) : null)}
            >
              <SelectTrigger id="ticket-idea">
                <SelectValue placeholder="Select idea" />
              </SelectTrigger>
              <SelectContent>
                {ideas.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField htmlFor="ticket-priority" label="Priority">
            <Select
              value={addTicketPriority}
              onValueChange={(v) =>
                setAddTicketPriority(v as "P0" | "P1" | "P2" | "P3")
              }
            >
              <SelectTrigger id="ticket-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="space-y-2">
            <GenericInputWithLabel
              id="ticket-feature"
              label="Feature (optional grouping)"
              value={addTicketFeature}
              onChange={(e) => setAddTicketFeature(e.target.value)}
              placeholder="e.g. Testing & quality"
            />
          </div>
          {(milestones.length === 0 || ideas.length === 0) && (
            <p className="text-sm text-amber-600">
              {milestones.length === 0 && ideas.length === 0
                ? "Create at least one Milestone and one Idea (Milestones tab / Ideas) to add tickets."
                : milestones.length === 0
                  ? "Create at least one Milestone (Milestones tab) to add tickets."
                  : "Link at least one Idea to this project (Ideas) to add tickets."}
            </p>
          )}
        </Form>
      </SharedDialog>
    </div>
  );
}

/* SummaryStatPill is now imported from @/components/shared/DisplayPrimitives */
