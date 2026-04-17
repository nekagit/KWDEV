"use client";

/** Project Run Tab component. */
import { useState, useCallback, useEffect, useMemo, useRef, Fragment } from "react";
import type { Project } from "@/types/project";
import type { NightShiftCirclePhase, RunInfo } from "@/types/run";
import { MAX_TERMINAL_SLOTS } from "@/types/run";
import { readProjectFileOrEmpty, listProjectFiles, updateProject, loadWorkspaceAgentsContent, getProjectConfig, setProjectConfig } from "@/lib/api-projects";
import { debugIngest } from "@/lib/debug-ingest";
import { fetchProjectTicketsAndKanban } from "@/lib/fetch-project-tickets-and-kanban";
import { invoke, isTauri, projectIdArgPayload, projectIdArgOptionalPayload, createPlanTicketPayload, setPlanKanbanStatePayload } from "@/lib/tauri";
import { getIdeasList } from "@/lib/api-ideas";
import { fetchProjectMilestones } from "@/lib/fetch-project-milestones";
import {
  buildKanbanFromTickets,
  applyInProgressState,
  type TodosKanbanData,
  type ParsedTicket,
} from "@/lib/todos-kanban";
import {
  WORKER_IMPLEMENT_ALL_PROMPT_PATH,
  WORKER_FIX_BUG_PROMPT_PATH,
  WORKER_NIGHT_SHIFT_PROMPT_PATH,
  WORKER_NIGHT_SHIFT_PHASE_PROMPT_PATHS,
  AGENTS_ROOT,
  WORKER_ANALYZE_PROJECT_PROMPT_PATH,
  WORKER_IDEA_TO_MILESTONES_PROMPT_PATH,
  WORKER_MILESTONE_TO_TICKETS_PROMPT_PATH,
  WORKER_IDEA_ANALYSIS_OUTPUT_PATH,
  WORKER_MILESTONES_OUTPUT_PATH,
  WORKER_TICKETS_OUTPUT_PATH,
} from "@/lib/cursor-paths";
import {
  parseIdeaFromOutput,
  parseMilestonesFromOutput,
  parseTicketsFromOutput,
} from "@/lib/parse-agent-output";
import {
  buildKanbanContextBlock,
  combinePromptRecordWithKanban,
  buildTicketPromptBlock,
} from "@/lib/kanban-prompt-blocks";
import { STATIC_ANALYSIS_CHECKLIST } from "@/lib/static-analysis-checklist";

const ANALYSIS_FIX_REPORT_FILE = "analysis-fix-report.txt";

function buildAnalysisFixPrompt(analysisReportContent: string): string {
  return `You are in the project repository. Below is the static analysis report (e.g. TypeScript, ESLint, Ruff errors). Your task:

1. Fix the issues reported in the codebase (edit the relevant files).
2. After applying fixes, write a report to \`${ANALYSIS_FIX_REPORT_FILE}\` at the project root. The report must describe:
   - Each fix you made (file, change, and why)
   - Any remaining issues you did not fix and why
   - Summary: how many issues fixed vs remaining

Keep the report clear and actionable. Then print a short confirmation that the fix report was written.

--- Static analysis report (fix the issues below) ---

${analysisReportContent}`;
}
import { ProjectPlanTab } from "@/components/organisms/Tabs/ProjectPlanTab";
import { EmptyState, LoadingState } from "@/components/molecules/Display/EmptyState";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRunStore, registerRunCompleteHandler } from "@/store/run-store";
import { toast } from "sonner";
import {
  Terminal,
  Play,
  Square,
  Eraser,
  Archive,
  Loader2,
  Zap,
  CheckCircle2,
  Circle,
  Activity,
  MonitorUp,
  Bug,
  ListTodo,
  Send,
  MessageCircleQuestion,
  History,
  Trash2,
  ChevronDown,
  Moon,
  Copy,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Search,
  X,
  RotateCcw,
  RotateCw,
  ListChecks,
  Sparkles,
  FileOutput,
  Wrench,
  Settings2,
  Plug,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { isImplementAllRun, getNextFreeSlotOrNull, parseTicketNumberFromRunLabel, formatElapsed } from "@/lib/run-helpers";
import { copySingleRunAsPlainTextToClipboard } from "@/lib/copy-single-run-as-plain-text";
import { downloadSingleRunAsPlainText } from "@/lib/download-single-run-as-plain-text";
import { copyAllRunHistoryToClipboard } from "@/lib/copy-all-run-history";
import { downloadAllRunHistory } from "@/lib/download-all-run-history";
import { downloadAllRunHistoryCsv, copyAllRunHistoryCsvToClipboard } from "@/lib/download-all-run-history-csv";
import { downloadAllRunHistoryJson, copyAllRunHistoryJsonToClipboard } from "@/lib/download-all-run-history-json";
import { downloadAllRunHistoryMarkdown, copyAllRunHistoryMarkdownToClipboard } from "@/lib/download-all-run-history-md";
import { PrintButton } from "@/components/molecules/Buttons/PrintButton";
import { RelativeTimeWithTooltip } from "@/components/molecules/Displays/RelativeTimeWithTooltip";
import { buildStaticAnalysisPrompt } from "@/lib/static-analysis-checklist";
import {
  getWorkerEnhancementToolLabelsByIds,
  getWorkerEnhancementToolIds,
  sanitizeWorkerEnhancementToolIds,
  WORKER_ENHANCEMENT_TOOL_CATEGORIES,
} from "@/lib/worker-enhancements-tools";
import { buildWorkerEnhancementsTestingPrompt } from "@/lib/worker-enhancements-testing-prompt";
import { getRunHistoryPreferences, setRunHistoryPreferences, DEFAULT_RUN_HISTORY_PREFERENCES, RUN_HISTORY_FILTER_QUERY_MAX_LEN, RUN_HISTORY_PREFERENCES_RESTORED_EVENT, type StoredSlotFilter, VALID_SLOT_OPTIONS } from "@/lib/run-history-preferences";
import { groupRunHistoryByDate, RUN_HISTORY_DATE_GROUP_LABELS, getRunHistoryDateGroupOrder, getRunHistoryDateGroupTitle } from "@/lib/run-history-date-groups";
import { useRunHistoryFocusFilterShortcut } from "@/lib/run-history-focus-filter-shortcut";
import { filterRunHistoryByQuery } from "@/lib/run-history-filter";
import { computeRunHistoryStats, formatRunHistoryStatsToolbar } from "@/lib/run-history-stats";
import { copyRunHistoryStatsSummaryToClipboard } from "@/lib/copy-run-history-stats-summary";
import { downloadRunHistoryStatsAsJson, copyRunHistoryStatsAsJsonToClipboard } from "@/lib/download-run-history-stats-json";
import { downloadRunHistoryStatsAsCsv, copyRunHistoryStatsAsCsvToClipboard } from "@/lib/download-run-history-stats-csv";
import { StatusPill } from "@/components/molecules/Displays/DisplayPrimitives";
import { TerminalSlot } from "@/components/molecules/Display/TerminalSlot";
import { WorkerAgentCard } from "@/components/molecules/CardsAndDisplay/WorkerAgentCard";
import { ProjectWorkerAgentsSection } from "@/components/organisms/Tabs/ProjectWorkerAgentsSection";
import { toggleWorkerRunSection } from "@/lib/worker-run-sections";
import {
  getWorkerRunSectionsGridClassName,
  WORKER_RUN_SECTION_CARD_CLASSNAME,
  WORKER_RUN_SECTION_SURFACE_CLASSNAME,
} from "@/lib/worker-run-layout";
import {
  getWorkerTopAppButtonClassName,
  getWorkerTopAppIconWrapClassName,
  TERMINAL_TOP_APP_LABEL,
  WORKER_TOP_APP_IDS,
  WORKER_TOP_APPS_ROW_CLASSNAME,
} from "@/lib/worker-run-top-apps";
import { KanbanTicketCard } from "@/components/organisms/Kanban/KanbanTicketCard";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Load concatenated content of all agent .md files for terminal-agent prompts. In Tauri prefers KWDEV workspace data/agents (@data) so the app is not dependent on the target project's .cursor; falls back to project data/agents. */
async function loadAllAgentsContent(projectId: string, repoPath: string): Promise<string> {
  if (isTauri) {
    const fromWorkspace = await loadWorkspaceAgentsContent();
    if (fromWorkspace) return fromWorkspace;
  }
  if (!repoPath?.trim()) return "";
  try {
    const entries = await listProjectFiles(projectId, AGENTS_ROOT, repoPath);
    const mdFiles = entries.filter((e) => !e.isDirectory && e.name.endsWith(".md"));
    const parts: string[] = [];
    for (const f of mdFiles) {
      const content = await readProjectFileOrEmpty(projectId, `${AGENTS_ROOT}/${f.name}`, repoPath);
      if (content?.trim()) parts.push(content.trim());
    }
    if (parts.length === 0) return "";
    return "\n\n---\n\n## Agent instructions (from " + AGENTS_ROOT + ")\n\n" + parts.join("\n\n---\n\n");
  } catch {
    return "";
  }
}

/** Fallback when project has no data/prompts/fix-bug.prompt.md */
const DEBUG_ASSISTANT_PROMPT_FALLBACK = `You are a debugging assistant in the current workspace. The user has pasted error/log output below. Identify the root cause, apply the fix in this workspace (edit files, run commands), and state what you fixed. Work only in this repo; be specific. If logs refer to another path, say so.

ERROR/LOG INFORMATION:
`;

/* ═══════════════════════════════════════════════════════════════════════════
   General queue — In Progress tickets from DB; run up to 3 at a time
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerGeneralQueueSection({
  projectId,
  repoPath,
  projectPath,
  kanbanData,
  onRunInProgress,
  onMarkAllInProgressDone,
  embedded = false,
}: {
  projectId: string;
  repoPath: string;
  projectPath: string;
  kanbanData: TodosKanbanData | null;
  onRunInProgress: () => Promise<void>;
  /** Mark all in-progress tickets as Done and refresh; use when work is done but DB still shows them in progress. */
  onMarkAllInProgressDone?: () => Promise<void>;
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [markingAllDone, setMarkingAllDone] = useState(false);
  const inProgressTickets = kanbanData?.columns?.in_progress?.items ?? [];
  const count = inProgressTickets.length;
  const canRun = count > 0 && projectPath.length > 0;

  const handleRun = async () => {
    setLoading(true);
    try {
      await onRunInProgress();
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          embedded ? "px-1 py-3" : "px-5 py-4"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl shrink-0",
              embedded
                ? "size-9 bg-teal-500/15 dark:bg-teal-400/10"
                : "size-7 rounded-lg bg-rose-500/10"
            )}
          >
            <ListTodo
              className={cn(
                "shrink-0",
                embedded ? "size-4 text-teal-500 dark:text-teal-400" : "size-3.5 text-rose-400"
              )}
            />
          </div>
          <div className="min-w-0">
            <h3
              className={cn(
                "font-semibold text-foreground tracking-tight",
                embedded ? "text-sm" : "text-xs"
              )}
            >
              Queue
            </h3>
            <p
              className={cn(
                "text-muted-foreground normal-case mt-0.5",
                embedded ? "text-xs" : "text-[10px]"
              )}
            >
              In Progress tickets from the database — run up to 3 at a time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "font-medium rounded-full border shrink-0",
              embedded
                ? "text-xs px-2.5 py-1 bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20"
                : "text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/50"
            )}
          >
            {count} {count === 1 ? "ticket" : "tickets"}
          </span>
          <Button
            variant="default"
            size="sm"
            className={cn(
              "gap-1.5 shrink-0 h-8 text-xs",
              embedded
                ? "bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                : "bg-sky-600 hover:bg-sky-700"
            )}
            disabled={!canRun || loading}
            onClick={handleRun}
            title="Run first 3 In Progress tickets in terminals"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run
          </Button>
          {count > 0 && onMarkAllInProgressDone && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 h-8 text-xs"
              disabled={markingAllDone}
              onClick={async () => {
                setMarkingAllDone(true);
                try {
                  await onMarkAllInProgressDone();
                  toast.success("All in-progress tickets marked as Done.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to mark all done");
                } finally {
                  setMarkingAllDone(false);
                }
              }}
              title="Mark all in-progress tickets as Done (clear queue)"
            >
              {markingAllDone ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Mark all Done
            </Button>
          )}
        </div>
      </div>
      {count > 0 && (
        <div className={cn("pt-0", embedded ? "px-1 pb-4" : "px-5 pb-4")}>
          <ul className={embedded ? "space-y-2" : "space-y-1.5"}>
            {inProgressTickets.map((ticket, idx) => (
              <li
                key={ticket.id}
                className={cn(
                  "flex items-center gap-3 text-xs transition-colors",
                  embedded
                    ? "rounded-lg border border-border/60 bg-background/60 dark:bg-muted/30 px-3 py-2.5 hover:border-teal-500/30 hover:bg-teal-500/[0.06]"
                    : "flex items-center gap-2"
                )}
              >
                {embedded && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                )}
                <span className="font-medium text-foreground/90 tabular-nums">#{ticket.number}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={ticket.title}>
                  {ticket.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {count === 0 && (
        <div className={cn("pt-0", embedded ? "px-1 pb-4" : "px-5 pb-4")}>
          <div
            className={cn(
              "rounded-xl border border-dashed border-border/80 text-center",
              embedded
                ? "bg-teal-500/[0.02] dark:bg-teal-500/[0.02] px-6 py-8"
                : "bg-muted/10 py-6"
            )}
          >
            <ListTodo
              className={cn(
                "mx-auto text-muted-foreground/50",
                embedded ? "size-10 mb-3" : "size-8 mb-2"
              )}
            />
            <p
              className={cn(
                "text-muted-foreground",
                embedded ? "text-sm" : "text-xs"
              )}
            >
              No tickets in progress.
            </p>
            <p
              className={cn(
                "text-muted-foreground/80 mt-1",
                embedded ? "text-xs" : "text-[10px]"
              )}
            >
              Move tickets to In Progress in the Planner tab, then run them here.
            </p>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-2xl surface-card border border-border/50 overflow-hidden bg-rose-500/[0.06]">
      {content}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Night shift — 3 agents run same prompt in a loop until stopped
   ═══════════════════════════════════════════════════════════════════════════ */

/** Badge order matches circle order: Create → Implement → Test → Debugging → Refactor. */
const NIGHT_SHIFT_BADGES = [
  { id: "create", label: "Create" },
  { id: "implement", label: "Implement" },
  { id: "test", label: "Test" },
  { id: "debugging", label: "Debugging" },
  { id: "refactor", label: "Refactor" },
] as const;

/** Fallback one-line prompt when phase file is missing or empty. */
const NIGHT_SHIFT_PHASE_FALLBACK: Record<NightShiftCirclePhase, string> = {
  refactor: "Focus on refactoring: identify scope, run tests before/after, improve structure and naming without changing behaviour. Run npm run verify when done.\n\n",
  test: "Focus on testing: identify feature under test, use project test framework (.cursor/1. project/testing.md), write or extend tests, run npm run verify.\n\n",
  debugging: "Focus on debugging: reproduce the issue, isolate cause, apply minimal fix, then run tests/build to verify.\n\n",
  implement: "Focus on implementation: extend existing features per ticket/plan; match project patterns, wire only where needed, run npm run verify.\n\n",
  create: "Focus on creating: add a new changelog-worthy capability; new files and clear boundaries, then run npm run verify.\n\n",
};

/** Load phase prompt from data/prompts/{phase}.prompt.md; fallback to default if missing or empty. */
async function loadPhasePrompt(
  projectId: string,
  projectPath: string,
  phase: NightShiftCirclePhase
): Promise<string> {
  const path = WORKER_NIGHT_SHIFT_PHASE_PROMPT_PATHS[phase];
  const content = (await readProjectFileOrEmpty(projectId, path, projectPath))?.trim() ?? "";
  return content ? content + "\n\n" : NIGHT_SHIFT_PHASE_FALLBACK[phase];
}

/** Circle phase order: create → implement → test → debugging → refactor; null after refactor = end. */
const CIRCLE_PHASE_ORDER: NightShiftCirclePhase[] = ["create", "implement", "test", "debugging", "refactor"];
function nextCirclePhase(phase: NightShiftCirclePhase): NightShiftCirclePhase | null {
  const i = CIRCLE_PHASE_ORDER.indexOf(phase);
  return i < 0 || i >= CIRCLE_PHASE_ORDER.length - 1 ? null : CIRCLE_PHASE_ORDER[i + 1];
}
/** Run label for circle mode so terminals and history show which phase is active. */
function nightShiftCircleRunLabel(slot: 1 | 2 | 3, phase: NightShiftCirclePhase): string {
  const phaseLabel = phase.charAt(0).toUpperCase() + phase.slice(1);
  return `Night shift (Terminal ${slot}) — ${phaseLabel}`;
}

/** Build badge block from selected badges (loads prompts from data/prompts/{id}.prompt.md) and optional extra instructions. */
async function buildBadgeAndInstructionsBlock(
  projectId: string,
  projectPath: string,
  badges: Record<string, boolean>,
  extraInstructions: string
): Promise<string> {
  let block = "";
  for (const b of NIGHT_SHIFT_BADGES) {
    if (badges[b.id]) block += await loadPhasePrompt(projectId, projectPath, b.id as NightShiftCirclePhase);
  }
  if (extraInstructions.trim()) {
    block += "\n\n## Additional instructions\n\n" + extraInstructions.trim() + "\n\n";
  }
  return block;
}

function WorkerNightShiftSection({
  projectId,
  projectPath,
  project,
  agentProvider = "cursor",
}: {
  projectId: string;
  projectPath: string;
  project?: Project | null;
  agentProvider?: "cursor" | "claude" | "gemini";
}) {
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const nightShiftActive = useRunStore((s) => s.nightShiftActive);
  const setNightShiftActive = useRunStore((s) => s.setNightShiftActive);
  const setNightShiftReplenishCallback = useRunStore((s) => s.setNightShiftReplenishCallback);
  const nightShiftCircleMode = useRunStore((s) => s.nightShiftCircleMode);
  const nightShiftCirclePhase = useRunStore((s) => s.nightShiftCirclePhase);
  const setNightShiftCircleState = useRunStore((s) => s.setNightShiftCircleState);
  const incrementNightShiftCircleCompleted = useRunStore((s) => s.incrementNightShiftCircleCompleted);
  const nightShiftIdeaDrivenMode = useRunStore((s) => s.nightShiftIdeaDrivenMode);
  const nightShiftIdeaDrivenIdea = useRunStore((s) => s.nightShiftIdeaDrivenIdea);
  const nightShiftIdeaDrivenTickets = useRunStore((s) => s.nightShiftIdeaDrivenTickets);
  const nightShiftIdeaDrivenTicketIndex = useRunStore((s) => s.nightShiftIdeaDrivenTicketIndex);
  const nightShiftIdeaDrivenPhase = useRunStore((s) => s.nightShiftIdeaDrivenPhase);
  const setNightShiftIdeaDrivenState = useRunStore((s) => s.setNightShiftIdeaDrivenState);
  const ideaDrivenAutoPhase = useRunStore((s) => s.ideaDrivenAutoPhase);
  const setIdeaDrivenAutoState = useRunStore((s) => s.setIdeaDrivenAutoState);
  const ideaDrivenChecklist = useRunStore((s) => s.ideaDrivenChecklist);
  const ideaDrivenLogs = useRunStore((s) => s.ideaDrivenLogs);
  const appendIdeaDrivenLog = useRunStore((s) => s.appendIdeaDrivenLog);
  const setIdeaDrivenChecklist = useRunStore((s) => s.setIdeaDrivenChecklist);
  const setIdeaDrivenChecklistItemStatus = useRunStore((s) => s.setIdeaDrivenChecklistItemStatus);
  const clearIdeaDrivenProgress = useRunStore((s) => s.clearIdeaDrivenProgress);
  const setIdeaDrivenTicketPhases = useRunStore((s) => s.setIdeaDrivenTicketPhases);
  const getState = useRunStore.getState;
  const [starting, setStarting] = useState(false);
  const [startingIdeaDriven, setStartingIdeaDriven] = useState(false);
  const [ideaDrivenDialogOpen, setIdeaDrivenDialogOpen] = useState(false);
  const [ideaDrivenCreateDescription, setIdeaDrivenCreateDescription] = useState("");
  const [badges, setBadges] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NIGHT_SHIFT_BADGES.map((b) => [b.id, false]))
  );
  const [extraInstructions, setExtraInstructions] = useState("");

  const toggleBadge = useCallback((id: string) => {
    setBadges((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleStart = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStarting(true);
    try {
      const basePrompt =
        (await readProjectFileOrEmpty(projectId, WORKER_NIGHT_SHIFT_PROMPT_PATH, projectPath))?.trim() ?? "";
      if (!basePrompt) {
        toast.error("Night shift prompt is empty. Add content to data/prompts/night-shift.prompt.md");
        return;
      }
      const badgeBlock = await buildBadgeAndInstructionsBlock(projectId, projectPath, badges, extraInstructions);
      const agentsBlock = await loadAllAgentsContent(projectId, projectPath);
      const promptContent = (basePrompt + badgeBlock + agentsBlock).trim();
      setNightShiftActive(true);
      setNightShiftReplenishCallback(async (slot: 1 | 2 | 3) => {
        const base =
          (await readProjectFileOrEmpty(projectId, WORKER_NIGHT_SHIFT_PROMPT_PATH, projectPath))?.trim() ?? "";
        if (base) {
          const agents = await loadAllAgentsContent(projectId, projectPath);
          const full = (base + badgeBlock + agents).trim();
          runTempTicket(projectPath, full, `Night shift (Terminal ${slot})`, {
            isNightShift: true,
            provider: agentProvider,
          });
        }
      });
      for (const slot of [1, 2, 3] as const) {
        runTempTicket(projectPath, promptContent, `Night shift (Terminal ${slot})`, { isNightShift: true, provider: agentProvider });
      }
      toast.success("Night shift started. 3 agents will run until you stop.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start night shift");
    } finally {
      setStarting(false);
    }
  }, [projectId, projectPath, badges, extraInstructions, runTempTicket, setNightShiftActive, setNightShiftReplenishCallback]);

  const handleCircleStart = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStarting(true);
    try {
      const basePrompt =
        (await readProjectFileOrEmpty(projectId, WORKER_NIGHT_SHIFT_PROMPT_PATH, projectPath))?.trim() ?? "";
      if (!basePrompt) {
        toast.error("Night shift prompt is empty. Add content to data/prompts/night-shift.prompt.md");
        return;
      }
      setNightShiftCircleState(true, "create", 0);
      setNightShiftActive(true);
      const createBadgeBlock = await buildBadgeAndInstructionsBlock(projectId, projectPath, { create: true }, extraInstructions);
      const agentsBlock = await loadAllAgentsContent(projectId, projectPath);
      const promptContent = (basePrompt + createBadgeBlock + agentsBlock).trim();
      setNightShiftReplenishCallback(async (slot: 1 | 2 | 3, exitingRun?: { meta?: { isNightShiftCircle?: boolean; circlePhase?: NightShiftCirclePhase } } | null) => {
        const state = getState();
        if (exitingRun?.meta?.isNightShiftCircle && exitingRun?.meta?.circlePhase === state.nightShiftCirclePhase) {
          incrementNightShiftCircleCompleted();
        }
        const s = getState();
        const phase = s.nightShiftCirclePhase;
        const completed = s.nightShiftCircleCompletedInPhase;
        if (phase == null) return;
        const buildPromptForPhase = async (p: NightShiftCirclePhase) => {
          const base =
            (await readProjectFileOrEmpty(projectId, WORKER_NIGHT_SHIFT_PROMPT_PATH, projectPath))?.trim() ?? "";
          const phasePrompt = await loadPhasePrompt(projectId, projectPath, p);
          const instructionsPart = extraInstructions.trim() ? "\n\n## Additional instructions\n\n" + extraInstructions.trim() + "\n\n" : "";
          const agents = await loadAllAgentsContent(projectId, projectPath);
          return (base + phasePrompt + instructionsPart + agents).trim();
        };
        if (completed >= 3) {
          const next = nextCirclePhase(phase);
          if (next === null) {
            setNightShiftCircleState(false, null, 0);
            setNightShiftActive(false);
            setNightShiftReplenishCallback(null);
            toast.success("Circle finished: all phases done.");
            return;
          }
          setNightShiftCircleState(true, next, 0);
          const nextPrompt = await buildPromptForPhase(next);
          for (const i of [1, 2, 3] as const) {
            runTempTicket(projectPath, nextPrompt, nightShiftCircleRunLabel(i, next), {
              isNightShift: true,
              isNightShiftCircle: true,
              circlePhase: next,
              provider: agentProvider,
            });
          }
          toast.success(`Circle: ${next} (3 agents).`);
        } else {
          const currentPrompt = await buildPromptForPhase(phase);
          runTempTicket(projectPath, currentPrompt, nightShiftCircleRunLabel(slot, phase), {
            isNightShift: true,
            isNightShiftCircle: true,
            circlePhase: phase,
            provider: agentProvider,
          });
        }
      });
      for (const slot of [1, 2, 3] as const) {
        runTempTicket(projectPath, promptContent, nightShiftCircleRunLabel(slot, "create"), {
          isNightShift: true,
          isNightShiftCircle: true,
          circlePhase: "create",
          provider: agentProvider,
        });
      }
      toast.success("Circle started: Create (3 agents).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start Circle");
      setNightShiftCircleState(false, null, 0);
    } finally {
      setStarting(false);
    }
  }, [projectId, projectPath, extraInstructions, runTempTicket, setNightShiftActive, setNightShiftReplenishCallback, setNightShiftCircleState, incrementNightShiftCircleCompleted, getState]);

  /** Start the automated idea-driven flow: analyze → milestones → tickets → execute circle → loop */
  const handleAutoIdeaDriven = useCallback(async () => {
    if (!projectPath?.trim() || !isTauri) return;
    setStartingIdeaDriven(true);
    setIdeaDrivenDialogOpen(false);

    try {
      const analyzePrompt = await readProjectFileOrEmpty(projectId, WORKER_ANALYZE_PROJECT_PROMPT_PATH, projectPath);
      if (!analyzePrompt?.trim()) {
        toast.error("Analyze project prompt not found. Create data/prompts/analyze-project.prompt.md");
        clearIdeaDrivenProgress();
        setIdeaDrivenChecklist([
          { id: "analyze", label: "Analyze project (prompt not found)", status: "done" },
          { id: "milestones", label: "Generate milestones", status: "pending" },
          { id: "tickets", label: "Create tickets", status: "pending" },
          { id: "execute", label: "Execute circle", status: "pending" },
        ]);
        appendIdeaDrivenLog("Analyze project prompt not found. Create data/prompts/analyze-project.prompt.md");
        setIdeaDrivenAutoState({ phase: "analyze", pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
        setStartingIdeaDriven(false);
        return;
      }

      clearIdeaDrivenProgress();
      setIdeaDrivenChecklist([
        { id: "analyze", label: "Analyze project", status: "in_progress" },
        { id: "milestones", label: "Generate milestones", status: "pending" },
        { id: "tickets", label: "Create tickets", status: "pending" },
        { id: "execute", label: "Execute circle", status: "pending" },
      ]);
      appendIdeaDrivenLog("Starting idea-driven: analyzing project…");
      setIdeaDrivenAutoState({
        phase: "analyze",
        pendingMilestones: [],
        currentMilestoneIndex: 0,
        allTickets: [],
        currentTicketIndex: 0,
      });
      setNightShiftActive(true);

      const requestId = `auto-idea-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      registerRunCompleteHandler(`auto_idea_analyze:${requestId}`, async (stdout: string) => {
        try {
          const outputContent = await readProjectFileOrEmpty(projectId, WORKER_IDEA_ANALYSIS_OUTPUT_PATH, projectPath);
          const parsedIdea = parseIdeaFromOutput(outputContent || stdout);

          if (!parsedIdea) {
            toast.error("Failed to parse idea from analysis output. Check data/prompts/idea-analysis-output.md");
            setIdeaDrivenChecklistItemStatus("analyze", "done");
            appendIdeaDrivenLog("Idea creation failed: Failed to parse idea from analysis output. Check data/prompts/idea-analysis-output.md");
            setIdeaDrivenAutoState({ phase: null, pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
            setNightShiftActive(false);
            return;
          }

          setIdeaDrivenChecklistItemStatus("analyze", "done");
          setIdeaDrivenChecklistItemStatus("milestones", "in_progress");
          appendIdeaDrivenLog("Idea created. Running milestones…");
          const createIdeaArgs = { projectId, title: parsedIdea.title, description: parsedIdea.description, category: "other", source: "auto-idea-driven" };
          const ideaRow = await invoke<{ id: number; title: string; description: string }>("create_idea", { args: createIdeaArgs });
          await updateProject(projectId, { ideaIds: [...(project?.ideaIds ?? []), ideaRow.id] });

          const sessionRunId = `session-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
          await invoke("append_implementation_log_entry", {
            projectId,
            runId: sessionRunId,
            ticketNumber: 0,
            ticketTitle: `Auto Idea-driven: ${ideaRow.title}`,
            milestoneId: null,
            ideaId: ideaRow.id,
            completedAt: new Date().toISOString(),
            filesChanged: "[]",
            summary: `Idea analyzed and created: ${parsedIdea.title}. Running milestones agent next.`,
          });
          window.dispatchEvent(new CustomEvent("ticket-implementation-done", { detail: { projectId, fromAutoIdeaDriven: true } }));

          setNightShiftIdeaDrivenState({
            mode: true,
            idea: { id: ideaRow.id, title: ideaRow.title, description: ideaRow.description ?? "" },
            tickets: [],
            ticketIndex: 0,
            phase: null,
            completedInPhase: 0,
            ideasQueue: [],
          });

          setIdeaDrivenAutoState({
            phase: "milestones",
            pendingMilestones: [],
            currentMilestoneIndex: 0,
            allTickets: [],
            currentTicketIndex: 0,
          });

          const milestonesPrompt = await readProjectFileOrEmpty(projectId, WORKER_IDEA_TO_MILESTONES_PROMPT_PATH, projectPath);
          if (!milestonesPrompt?.trim()) {
            toast.error("Milestones prompt not found.");
            appendIdeaDrivenLog("Milestones prompt not found. Create data/prompts/idea-to-milestones.prompt.md (or milestone-to-tickets).");
            return;
          }

          const milestonesRequestId = `auto-milestones-${Date.now()}`;
          registerRunCompleteHandler(`auto_idea_milestones:${milestonesRequestId}`, async () => {
            await handleMilestonesComplete(ideaRow.id);
          });

          const label = `Auto Idea-driven — Milestones for: ${ideaRow.title}`;
          runTempTicket(projectPath, milestonesPrompt.trim(), label, {
            isNightShift: true,
            isNightShiftIdeaDriven: true,
            onComplete: `auto_idea_milestones`,
            payload: { requestId: milestonesRequestId },
            provider: agentProvider,
          });
          toast.success(`Auto Idea-driven: idea "${ideaRow.title}" created. Running milestones agent...`);
        } catch (err) {
          console.error("[auto-idea-driven] analyze complete error:", err);
          const errMsg = err instanceof Error ? err.message : "Failed to process analysis";
          toast.error(errMsg);
          setIdeaDrivenChecklistItemStatus("analyze", "done");
          appendIdeaDrivenLog(`Idea creation failed: ${errMsg}`);
          setIdeaDrivenAutoState({ phase: null, pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
          setNightShiftActive(false);
        }
      });

      const label = `Auto Idea-driven — Analyzing project`;
      runTempTicket(projectPath, analyzePrompt.trim(), label, {
        isNightShift: true,
        isNightShiftIdeaDriven: true,
        onComplete: `auto_idea_analyze`,
        payload: { requestId },
        provider: agentProvider,
      });
      toast.success("Auto Idea-driven: analyzing project to find next feature...");
    } catch (e) {
      const startErrMsg = e instanceof Error ? e.message : "Failed to start auto idea-driven";
      toast.error(startErrMsg);
      clearIdeaDrivenProgress();
      setIdeaDrivenChecklist([
        { id: "analyze", label: "Analyze project (start failed)", status: "done" },
        { id: "milestones", label: "Generate milestones", status: "pending" },
        { id: "tickets", label: "Create tickets", status: "pending" },
        { id: "execute", label: "Execute circle", status: "pending" },
      ]);
      appendIdeaDrivenLog(`Start failed: ${startErrMsg}`);
      setIdeaDrivenAutoState({ phase: "analyze", pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
      setNightShiftActive(false);
    } finally {
      setStartingIdeaDriven(false);
    }
  }, [projectId, projectPath, project?.ideaIds, runTempTicket, setNightShiftActive, setNightShiftIdeaDrivenState, setIdeaDrivenAutoState, clearIdeaDrivenProgress, setIdeaDrivenChecklist, appendIdeaDrivenLog, setIdeaDrivenChecklistItemStatus]);

  const handleMilestonesComplete = useCallback(async (ideaId: number) => {
    try {
      const outputContent = await readProjectFileOrEmpty(projectId, WORKER_MILESTONES_OUTPUT_PATH, projectPath);
      const parsedMilestones = parseMilestonesFromOutput(outputContent || "");

      if (parsedMilestones.length === 0) {
        toast.error("No milestones parsed from output. Check data/prompts/milestones-output.md");
        setIdeaDrivenAutoState({ phase: null, pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
        setNightShiftActive(false);
        return;
      }

      const createdMilestones: Array<{ id: number; name: string; description: string }> = [];
      for (const m of parsedMilestones) {
        const milestoneRow = await invoke<{ id: number; name: string; slug: string }>("create_project_milestone", {
          args: { projectId, name: m.name, slug: "" },
        });
        createdMilestones.push({ id: milestoneRow.id, name: m.name, description: m.description });
      }

      setIdeaDrivenChecklistItemStatus("milestones", "done");
      setIdeaDrivenChecklistItemStatus("tickets", "in_progress");
      appendIdeaDrivenLog(`${createdMilestones.length} milestones created. Creating tickets…`);
      setIdeaDrivenAutoState({
        phase: "tickets",
        pendingMilestones: createdMilestones,
        currentMilestoneIndex: 0,
        allTickets: [],
        currentTicketIndex: 0,
      });

      toast.success(`Auto Idea-driven: ${createdMilestones.length} milestones created. Creating tickets...`);
      await runTicketsAgentForMilestone(createdMilestones, 0, ideaId);
    } catch (err) {
      console.error("[auto-idea-driven] milestones complete error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process milestones");
      setIdeaDrivenAutoState({ phase: null, pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
      setNightShiftActive(false);
    }
  }, [projectId, projectPath, setIdeaDrivenAutoState, setNightShiftActive, setIdeaDrivenChecklistItemStatus, appendIdeaDrivenLog]);

  /** Start the single "implement" run for one ticket (idea-driven: one run per ticket, no 5-phase circle). */
  const startImplementForTicket = useCallback(
    async (ticket: { id: string; number: number; title: string; description?: string; priority: string; milestoneId?: number; ideaId?: number }) => {
      const ticketForState = { ...ticket, featureName: "General", agents: [] as string[] };
      const phasePrompt = await loadPhasePrompt(projectId, projectPath, "implement");
      const ticketBlock = buildTicketPromptBlock(ticketForState, null);
      const header = `Night shift — Implement for ticket #${ticket.number}: ${ticket.title}\n\n`;
      const base = (await readProjectFileOrEmpty(projectId, WORKER_NIGHT_SHIFT_PROMPT_PATH, projectPath))?.trim() ?? "";
      const agents = await loadAllAgentsContent(projectId, projectPath);
      const prompt = (header + base + "\n\n" + phasePrompt + "\n\n" + ticketBlock + "\n\n" + agents).trim();
      const label = `Night shift — Implement #${ticket.number}: ${ticket.title}`;
      runTempTicket(projectPath, prompt, label, {
        isNightShift: true,
        isNightShiftIdeaDriven: true,
        ideaDrivenTicketId: ticket.id,
        ideaDrivenPhase: "implement",
        provider: agentProvider,
      });
    },
    [projectId, projectPath, runTempTicket, agentProvider]
  );

  const runTicketsAgentForMilestone = useCallback(async (
    milestones: Array<{ id: number; name: string; description: string }>,
    milestoneIndex: number,
    ideaId: number
  ) => {
    if (milestoneIndex >= milestones.length) {
      const s = getState();
      const allTickets = s.ideaDrivenAllTickets;
      if (allTickets.length === 0) {
        toast.error("No tickets were created. Stopping.");
        setIdeaDrivenAutoState({ phase: null, pendingMilestones: [], currentMilestoneIndex: 0, allTickets: [], currentTicketIndex: 0 });
        setNightShiftActive(false);
        return;
      }
      setIdeaDrivenChecklistItemStatus("tickets", "done");
      const baseChecklist = getState().ideaDrivenChecklist.filter((i) => i.id !== "execute");
      type ChecklistItem = { id: string; label: string; status: "pending" | "in_progress" | "done" };
      const fillCount = Math.min(6, allTickets.length);
      const newItems: ChecklistItem[] = allTickets.map((t, i) => ({
        id: `exec-${t.id}`,
        label: `#${t.number}: ${t.title}`,
        status: i < fillCount ? "in_progress" : "pending",
      }));
      setIdeaDrivenChecklist([...baseChecklist, ...newItems] as ChecklistItem[]);
      appendIdeaDrivenLog(`All tickets created. Implementing ${allTickets.length} tickets (${fillCount} slots).`);
      toast.success(`Auto Idea-driven: ${allTickets.length} tickets created. Starting implement...`);
      setIdeaDrivenAutoState({
        phase: "execute",
        pendingMilestones: milestones,
        currentMilestoneIndex: milestones.length,
        allTickets,
        currentTicketIndex: 0,
      });
      setIdeaDrivenTicketPhases({});
      setNightShiftIdeaDrivenState({
        mode: true,
        idea: getState().nightShiftIdeaDrivenIdea,
        tickets: allTickets.map((t) => ({ ...t, featureName: "General" })),
        ticketIndex: 0,
        phase: "implement",
        completedInPhase: 0,
        ideasQueue: [],
      });
      setNightShiftReplenishCallback(async (slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => {
        try {
          const state = getState();
          if (!state.nightShiftIdeaDrivenMode) return;
          const runMeta = exitingRun?.meta;
          if (!runMeta?.isNightShiftIdeaDriven || !runMeta.ideaDrivenTicketId || runMeta.ideaDrivenPhase == null) return;
          const ticketId = runMeta.ideaDrivenTicketId;
          const allTicketsList = state.ideaDrivenAllTickets;
          const ticket = allTicketsList.find((t) => t.id === ticketId);
          if (!ticket) return;

          setIdeaDrivenTicketPhases((prev) => ({ ...prev, [ticketId]: "done" }));
          setIdeaDrivenChecklistItemStatus(`exec-${ticketId}`, "done");
          appendIdeaDrivenLog(`Ticket #${ticket.number} implemented.`);
          toast.success(`Auto Idea-driven: ticket #${ticket.number} completed.`);
          const phases = getState().ideaDrivenTicketPhases;
          const nextTicket = allTicketsList.find((t) => phases[t.id] !== "done" && phases[t.id] === undefined);
          if (nextTicket) {
            setIdeaDrivenTicketPhases((prev) => ({ ...prev, [nextTicket.id]: "implement" }));
            setIdeaDrivenChecklistItemStatus(`exec-${nextTicket.id}`, "in_progress");
            appendIdeaDrivenLog(`Implementing ticket #${nextTicket.number}: ${nextTicket.title}`);
            startImplementForTicket(nextTicket);
            toast.success(`Auto Idea-driven: implementing ticket #${nextTicket.number}: ${nextTicket.title}`);
          } else {
            const currentPhases = getState().ideaDrivenTicketPhases;
            const allDone = allTicketsList.length > 0 && allTicketsList.every((t) => currentPhases[t.id] === "done");
            if (allDone) {
              (async () => {
                const doCleanupAndStop = async () => {
                  setNightShiftActive(false);
                  setNightShiftReplenishCallback(null);
                  setNightShiftIdeaDrivenState({
                    mode: false,
                    idea: null,
                    tickets: [],
                    ticketIndex: 0,
                    phase: null,
                    completedInPhase: 0,
                    ideasQueue: [],
                  });
                  setIdeaDrivenAutoState({
                    phase: null,
                    pendingMilestones: [],
                    currentMilestoneIndex: 0,
                    allTickets: [],
                    currentTicketIndex: 0,
                  });
                  setIdeaDrivenTicketPhases({});
                  clearIdeaDrivenProgress();
                  let deleteErrors = false;
                  const ideasList: Array<{ id: number }> = await getIdeasList(projectId).catch(() => []);
                  for (const idea of ideasList) {
                    try {
                      if (isTauri) {
                        await invoke("delete_idea", { args: { ideaId: idea.id } });
                      } else {
                        const res = await fetch(`/api/data/ideas/${idea.id}`, { method: "DELETE" });
                        if (!res.ok) deleteErrors = true;
                      }
                    } catch {
                      deleteErrors = true;
                    }
                  }
                  const milestonesList = await fetchProjectMilestones(projectId).catch(() => []);
                  for (const m of milestonesList) {
                    try {
                      if (isTauri) {
                        await invoke("delete_project_milestone", { projectId, milestoneId: m.id });
                      } else {
                        const res = await fetch(`/api/data/projects/${projectId}/milestones/${m.id}`, { method: "DELETE" });
                        if (!res.ok) deleteErrors = true;
                      }
                    } catch {
                      deleteErrors = true;
                    }
                  }
                  window.dispatchEvent(new CustomEvent("ticket-implementation-done", { detail: { projectId, fromAutoIdeaDriven: true } }));
                  if (deleteErrors) {
                    toast.success("Idea-driven complete. Some ideas or milestones could not be deleted. See Control tab for summary.");
                  } else {
                    toast.success("Idea-driven complete. Ideas and milestones cleared. See Control tab for summary.");
                  }
                };

                try {
                  setIdeaDrivenAutoState({
                    phase: "analyze",
                    pendingMilestones: [],
                    currentMilestoneIndex: 0,
                    allTickets: [],
                    currentTicketIndex: 0,
                  });
                  setIdeaDrivenChecklist([
                    { id: "analyze", label: "Analyze project", status: "in_progress" },
                    { id: "milestones", label: "Generate milestones", status: "pending" },
                    { id: "tickets", label: "Create tickets", status: "pending" },
                    { id: "execute", label: "Execute circle", status: "pending" },
                  ]);
                  appendIdeaDrivenLog("Fetching next idea…");
                  toast.success("Auto Idea-driven: fetching next idea…");

                  const analyzePrompt = await readProjectFileOrEmpty(projectId, WORKER_ANALYZE_PROJECT_PROMPT_PATH, projectPath);
                  if (!analyzePrompt?.trim()) {
                    appendIdeaDrivenLog("Analyze prompt not found. Stopping.");
                    await doCleanupAndStop();
                    return;
                  }

                  const requestId = `auto-idea-next-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  registerRunCompleteHandler(`auto_idea_analyze:${requestId}`, async (stdout: string) => {
                    try {
                      const outputContent = await readProjectFileOrEmpty(projectId, WORKER_IDEA_ANALYSIS_OUTPUT_PATH, projectPath);
                      const parsedIdea = parseIdeaFromOutput(outputContent || stdout);
                      if (!parsedIdea) {
                        appendIdeaDrivenLog("No next idea parsed. Stopping.");
                        await doCleanupAndStop();
                        return;
                      }
                      setIdeaDrivenChecklistItemStatus("analyze", "done");
                      setIdeaDrivenChecklistItemStatus("milestones", "in_progress");
                      appendIdeaDrivenLog("Next idea created. Running milestones…");
                      const createIdeaArgs = { projectId, title: parsedIdea.title, description: parsedIdea.description, category: "other", source: "auto-idea-driven" };
                      const ideaRow = await invoke<{ id: number; title: string; description: string }>("create_idea", { args: createIdeaArgs });
                      await updateProject(projectId, { ideaIds: [...(project?.ideaIds ?? []), ideaRow.id] });
                      const sessionRunId = `session-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
                      await invoke("append_implementation_log_entry", {
                        projectId,
                        runId: sessionRunId,
                        ticketNumber: 0,
                        ticketTitle: `Auto Idea-driven: ${ideaRow.title}`,
                        milestoneId: null,
                        ideaId: ideaRow.id,
                        completedAt: new Date().toISOString(),
                        filesChanged: "[]",
                        summary: `Idea analyzed and created: ${parsedIdea.title}. Running milestones agent next.`,
                      });
                      window.dispatchEvent(new CustomEvent("ticket-implementation-done", { detail: { projectId, fromAutoIdeaDriven: true } }));
                      setNightShiftIdeaDrivenState({
                        mode: true,
                        idea: { id: ideaRow.id, title: ideaRow.title, description: ideaRow.description ?? "" },
                        tickets: [],
                        ticketIndex: 0,
                        phase: null,
                        completedInPhase: 0,
                        ideasQueue: [],
                      });
                      setIdeaDrivenAutoState({
                        phase: "milestones",
                        pendingMilestones: [],
                        currentMilestoneIndex: 0,
                        allTickets: [],
                        currentTicketIndex: 0,
                      });
                      const milestonesPrompt = await readProjectFileOrEmpty(projectId, WORKER_IDEA_TO_MILESTONES_PROMPT_PATH, projectPath);
                      if (!milestonesPrompt?.trim()) {
                        toast.error("Milestones prompt not found.");
                        appendIdeaDrivenLog("Milestones prompt not found. Stopping.");
                        await doCleanupAndStop();
                        return;
                      }
                      const milestonesRequestId = `auto-milestones-next-${Date.now()}`;
                      registerRunCompleteHandler(`auto_idea_milestones:${milestonesRequestId}`, async () => {
                        await handleMilestonesComplete(ideaRow.id);
                      });
                      const label = `Auto Idea-driven — Milestones for: ${ideaRow.title}`;
                      runTempTicket(projectPath, milestonesPrompt.trim(), label, {
                        isNightShift: true,
                        isNightShiftIdeaDriven: true,
                        onComplete: `auto_idea_milestones`,
                        payload: { requestId: milestonesRequestId },
                        provider: agentProvider,
                      });
                      toast.success(`Auto Idea-driven: next idea "${ideaRow.title}" created. Running milestones...`);
                    } catch (err) {
                      console.error("[auto-idea-driven] next idea analyze complete error:", err);
                      const errMsg = err instanceof Error ? err.message : "Failed to process next idea";
                      toast.error(errMsg);
                      appendIdeaDrivenLog(`Next idea failed: ${errMsg}`);
                      await doCleanupAndStop();
                    }
                  });

                  const label = `Auto Idea-driven — Analyzing project (next idea)`;
                  runTempTicket(projectPath, analyzePrompt.trim(), label, {
                    isNightShift: true,
                    isNightShiftIdeaDriven: true,
                    onComplete: `auto_idea_analyze`,
                    payload: { requestId },
                    provider: agentProvider,
                  });
                } catch (err) {
                  console.error("[auto-idea-driven] cycle to next idea error:", err);
                  toast.error(err instanceof Error ? err.message : "Failed to fetch next idea.");
                  await doCleanupAndStop();
                }
              })();
            }
          }
        } catch (err) {
          console.error("[auto-idea-driven] replenish error:", err);
          toast.error(err instanceof Error ? err.message : "Implement step failed.");
        }
      });
      for (let i = 0; i < fillCount; i++) {
        const t = allTickets[i];
        setIdeaDrivenTicketPhases((prev) => ({ ...prev, [t.id]: "implement" }));
        startImplementForTicket(t);
      }
      toast.success(`Auto Idea-driven: ${fillCount} agents started.`);
      return;
    }

    const milestone = milestones[milestoneIndex];
    const ticketsPrompt = await readProjectFileOrEmpty(projectId, WORKER_MILESTONE_TO_TICKETS_PROMPT_PATH, projectPath);
    if (!ticketsPrompt?.trim()) {
      toast.error("Tickets prompt not found.");
      return;
    }

    const contextPrompt = `${ticketsPrompt.trim()}\n\n## Current Milestone\n\n**Name:** ${milestone.name}\n**Description:** ${milestone.description}`;
    const ticketsRequestId = `auto-tickets-${milestoneIndex}-${Date.now()}`;

    registerRunCompleteHandler(`auto_idea_tickets:${ticketsRequestId}`, async () => {
      try {
        const outputContent = await readProjectFileOrEmpty(projectId, WORKER_TICKETS_OUTPUT_PATH, projectPath);
        const parsedTickets = parseTicketsFromOutput(outputContent || "");

        const createdTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; milestoneId?: number; ideaId?: number }> = [];
        for (const t of parsedTickets) {
          const ticketRow = await invoke<{ id: string; number: number; title: string; description?: string }>(
            "create_plan_ticket",
            createPlanTicketPayload({
              project_id: projectId,
              title: t.title,
              description: t.description,
              milestone_id: milestone.id,
              idea_id: ideaId,
            })
          );
          createdTickets.push({
            id: ticketRow.id,
            number: ticketRow.number,
            title: ticketRow.title,
            description: ticketRow.description,
            priority: t.priority,
            milestoneId: milestone.id,
            ideaId,
          });
        }

        const s = getState();
        const updatedTickets = [...s.ideaDrivenAllTickets, ...createdTickets];
        setIdeaDrivenAutoState({
          phase: "tickets",
          pendingMilestones: milestones,
          currentMilestoneIndex: milestoneIndex + 1,
          allTickets: updatedTickets,
          currentTicketIndex: 0,
        });

        await runTicketsAgentForMilestone(milestones, milestoneIndex + 1, ideaId);
      } catch (err) {
        console.error("[auto-idea-driven] tickets complete error:", err);
        toast.error(err instanceof Error ? err.message : "Failed to process tickets");
      }
    });

    const label = `Auto Idea-driven — Tickets for: ${milestone.name}`;
    runTempTicket(projectPath, contextPrompt, label, {
      isNightShift: true,
      isNightShiftIdeaDriven: true,
      onComplete: `auto_idea_tickets`,
      payload: { requestId: ticketsRequestId },
      provider: agentProvider,
    });
  }, [projectId, projectPath, runTempTicket, getState, setIdeaDrivenAutoState, setNightShiftActive, setIdeaDrivenChecklistItemStatus, setIdeaDrivenChecklist, appendIdeaDrivenLog, setIdeaDrivenTicketPhases, setNightShiftIdeaDrivenState, setNightShiftReplenishCallback, startImplementForTicket, handleAutoIdeaDriven]);

  const handleStop = useCallback(() => {
    setNightShiftActive(false);
    setNightShiftReplenishCallback(null);
    setNightShiftCircleState(false, null, 0);
    setNightShiftIdeaDrivenState({
      mode: false,
      idea: null,
      tickets: [],
      ticketIndex: 0,
      phase: null,
      completedInPhase: 0,
      ideasQueue: [],
    });
    setIdeaDrivenAutoState({
      phase: null,
      pendingMilestones: [],
      currentMilestoneIndex: 0,
      allTickets: [],
      currentTicketIndex: 0,
    });
    setIdeaDrivenTicketPhases({});
    clearIdeaDrivenProgress();
    toast.success("Night shift stopped. Current runs will finish; no new runs will start.");
  }, [setNightShiftActive, setNightShiftReplenishCallback, setNightShiftCircleState, setNightShiftIdeaDrivenState, setIdeaDrivenAutoState, setIdeaDrivenTicketPhases, clearIdeaDrivenProgress]);

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.08] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 rounded-lg bg-cyan-500/15">
            <Moon className="size-3.5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">Night shift</h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Prompt from data/prompts/night-shift.prompt.md runs on 3 agents; when one finishes, the same prompt runs again until you stop. Edit that file to change the prompt.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nightShiftActive ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleStop}
              title="Stop night shift (no new runs)"
            >
              <Square className="size-3.5" />
              Stop
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-cyan-500 text-cyan-50 hover:bg-cyan-400"
                disabled={!projectPath?.trim() || starting}
                onClick={handleStart}
                title="Start 3 agents with same prompt in a loop"
              >
                {starting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Start
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1.5"
                disabled={!projectPath?.trim() || starting}
                onClick={handleCircleStart}
                title="Run Create → Implement → Test → Debugging → Refactor (3 agents per phase)"
              >
                <RotateCw className="size-3.5" />
                Circle
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1.5"
                disabled={!projectPath?.trim() || starting || startingIdeaDriven || !isTauri}
                onClick={() => setIdeaDrivenDialogOpen(true)}
                title="Implement tickets (one run per ticket, desktop only)"
              >
                {startingIdeaDriven ? <Loader2 className="size-3.5 animate-spin" /> : <ListTodo className="size-3.5" />}
                Idea-driven
              </Button>
            </>
          )}
        </div>
      </div>
      {(!nightShiftActive || nightShiftCircleMode || nightShiftIdeaDrivenMode || ideaDrivenAutoPhase != null) && (
        <>
          <div className="px-5 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">
                {nightShiftCircleMode ? "Circle phase:" : "Mode (click to toggle):"}
              </span>
              {nightShiftActive && nightShiftCircleMode && nightShiftCirclePhase && !nightShiftIdeaDrivenMode && (
                <span className="text-[10px] font-medium text-cyan-700 dark:text-cyan-400" aria-live="polite">
                  Current: {NIGHT_SHIFT_BADGES.find((b) => b.id === nightShiftCirclePhase)?.label ?? nightShiftCirclePhase}
                </span>
              )}
              {nightShiftActive && nightShiftIdeaDrivenMode && nightShiftIdeaDrivenIdea && nightShiftIdeaDrivenPhase && (
                <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400" aria-live="polite">
                  Idea: {nightShiftIdeaDrivenIdea.title} | Ticket #{nightShiftIdeaDrivenTickets[nightShiftIdeaDrivenTicketIndex]?.number ?? "—"}: {nightShiftIdeaDrivenTickets[nightShiftIdeaDrivenTicketIndex]?.title ?? "—"} | {NIGHT_SHIFT_BADGES.find((b) => b.id === nightShiftIdeaDrivenPhase)?.label ?? nightShiftIdeaDrivenPhase}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {NIGHT_SHIFT_BADGES.map((b) => {
                const selected = nightShiftCircleMode ? b.id === nightShiftCirclePhase : !!badges[b.id];
                return (
                  <Badge
                    key={b.id}
                    variant={selected ? "default" : "outline"}
                    className={cn(
                      "text-xs font-medium transition-colors",
                      nightShiftCircleMode ? "cursor-default" : "cursor-pointer hover:bg-muted/60",
                      selected
                        ? "bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white ring-2 ring-cyan-400 ring-offset-2 ring-offset-background"
                        : nightShiftCircleMode ? "" : "hover:bg-muted/60"
                    )}
                    onClick={nightShiftCircleMode ? undefined : () => toggleBadge(b.id)}
                    role={nightShiftCircleMode ? undefined : "button"}
                    tabIndex={nightShiftCircleMode ? undefined : 0}
                    aria-pressed={nightShiftCircleMode ? selected : undefined}
                    title={nightShiftCircleMode && selected ? "Current phase" : undefined}
                    onKeyDown={
                      nightShiftCircleMode
                        ? undefined
                        : (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBadge(b.id);
                          }
                        }
                    }
                  >
                    {b.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          {!nightShiftActive && (
            <div className="px-5 pb-4">
              <label className="text-[10px] text-muted-foreground block mb-1">Extra instructions</label>
              <Textarea
                placeholder="Optional: add instructions that are appended to the prompt for this run."
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                className="min-h-[60px] text-xs resize-y"
                rows={2}
              />
            </div>
          )}

          {(ideaDrivenChecklist.length > 0 || ideaDrivenLogs.length > 0) && (
            <div className="px-5 py-4 space-y-3 bg-cyan-500/[0.08] border-t border-cyan-500/20">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ListChecks className="size-3.5" />
                Idea-driven progress
              </h4>
              {ideaDrivenChecklist.length > 0 && (
                <ul className="space-y-1.5" role="list">
                  {ideaDrivenChecklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs">
                      {item.status === "done" ? (
                        <CheckCircle2 className="size-3.5 text-cyan-600 shrink-0" aria-hidden />
                      ) : item.status === "in_progress" ? (
                        <Loader2 className="size-3.5 animate-spin text-cyan-500 shrink-0" aria-hidden />
                      ) : (
                        <Circle className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                      )}
                      <span className={cn(item.status === "done" && "text-muted-foreground line-through")}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {ideaDrivenLogs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Logs</span>
                  <ScrollArea className="h-24 rounded-md bg-background/80 p-2">
                    <div className="space-y-1 text-[11px] text-muted-foreground font-mono">
                      {[...ideaDrivenLogs].reverse().map((log) => (
                        <div key={log.id} className="flex gap-2">
                          <span className="shrink-0 text-[10px] opacity-70">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={ideaDrivenDialogOpen} onOpenChange={setIdeaDrivenDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Auto Idea-driven Night shift</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 max-h-[60vh] pr-3">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Automatically analyze the project, discover the next major feature, create milestones and tickets, then implement each ticket (one run per ticket).
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  <span>Analyze project → find next feature idea</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  <span>Break idea into milestones</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  <span>Create tickets for each milestone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">4.</span>
                  <span>Implement each ticket (one run per ticket)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">5.</span>
                  <span>Loop back to step 1 for the next idea</span>
                </div>
              </div>
              {ideaDrivenAutoPhase && (
                <div className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-2 rounded-lg">
                  <span className="font-medium">Current phase:</span> {ideaDrivenAutoPhase}
                </div>
              )}
              <div className="space-y-3 border-t border-border/50 pt-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ListChecks className="size-3.5" />
                  Current situation
                </h4>
                <ul className="space-y-1.5" role="list">
                  {(ideaDrivenChecklist.length > 0 ? ideaDrivenChecklist : [
                    { id: "analyze", label: "Analyze project", status: "pending" as const },
                    { id: "milestones", label: "Generate milestones", status: "pending" as const },
                    { id: "tickets", label: "Create tickets", status: "pending" as const },
                    { id: "execute", label: "Execute circle", status: "pending" as const },
                  ]).map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs">
                      {item.status === "done" ? (
                        <CheckCircle2 className="size-3.5 text-sky-600 shrink-0" aria-hidden />
                      ) : item.status === "in_progress" ? (
                        <Loader2 className="size-3.5 animate-spin text-indigo-500 shrink-0" aria-hidden />
                      ) : (
                        <Circle className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
                      )}
                      <span className={cn(item.status === "done" && "text-muted-foreground line-through")}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Logs</span>
                  <ScrollArea className="max-h-32 rounded-md border border-border/50 bg-background/80 p-2">
                    <div className="space-y-1 text-[11px] text-muted-foreground font-mono">
                      {ideaDrivenLogs.length > 0 ? (
                        [...ideaDrivenLogs].reverse().map((log) => (
                          <div key={log.id} className="flex gap-2">
                            <span className="shrink-0 text-[10px] opacity-70">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span>{log.message}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground/70">No logs yet. Start to see progress.</span>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex flex-col gap-2 pt-2 shrink-0">
            <Button
              variant="default"
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
              disabled={startingIdeaDriven || nightShiftActive}
              onClick={handleAutoIdeaDriven}
            >
              {startingIdeaDriven ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Start Auto Idea-driven
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIdeaDrivenDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

interface ProjectRunTabProps {
  project: Project;
  projectId: string;
  agentProvider?: "cursor" | "claude" | "gemini";
}

type WorkerRunAppId =
  | "status"
  | "queue"
  | "agents"
  | "vibing"
  | "enhancements"
  | "terminal-output";

export function ProjectRunTab({ project, projectId, agentProvider = "cursor" }: ProjectRunTabProps) {
  const [kanbanData, setKanbanData] = useState<TodosKanbanData | null>(null);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const [openWorkerApps, setOpenWorkerApps] = useState<WorkerRunAppId[]>([]);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const runningTerminalCount = runningRuns.filter((r) => isImplementAllRun(r) && r.status === "running").length;

  const loadTicketsAndKanban = useCallback(async () => {
    if (!projectId) return;
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      // #region agent log
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectRunTab.tsx:loadTicketsAndKanban", message: "Worker: loadTicketsAndKanban start", data: { projectId, useInvoke: true } }).catch(() => { });
      }
      // #endregion
      const { tickets, inProgressIds } = await fetchProjectTicketsAndKanban(projectId);
      const data = buildKanbanFromTickets(tickets, inProgressIds);
      setKanbanData(data);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setKanbanError(errMsg);
      // #region agent log
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectRunTab.tsx:loadTicketsAndKanban:catch", message: "Worker: loadTicketsAndKanban failed", data: { error: errMsg, projectId } }).catch(() => { });
      }
      debugIngest({ location: "ProjectRunTab.tsx:loadTicketsAndKanban:catch", message: "Worker loadTicketsAndKanban failed", data: { error: errMsg }, timestamp: Date.now(), hypothesisId: "WorkerTab" });
      // #endregion
    } finally {
      setKanbanLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTicketsAndKanban();
  }, [loadTicketsAndKanban]);

  /* ═══ Handlers (Duplicated from tickets tab for interactivity) ═══ */

  const handleMarkDone = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      try {
        if (isTauri) {
          await invoke("update_plan_ticket", {
            projectId,
            ticketId,
            done: true,
            status: "Done",
          });
        } else {
          const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: true, status: "Done" }),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        }
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
    [projectId, kanbanData, isTauri]
  );

  const handleRedo = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      try {
        if (isTauri) {
          await invoke("update_plan_ticket", {
            projectId,
            ticketId,
            done: false,
            status: "Todo",
          });
        } else {
          const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: false, status: "Todo" }),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
        }
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
    [projectId, kanbanData, isTauri]
  );

  const handleArchive = useCallback(
    async (ticketId: string) => {
      if (!kanbanData) return;
      const ticket = kanbanData.tickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      try {
        const inProgressIds = (kanbanData.columns.in_progress?.items.map((t) => t.id) ?? []).filter((id) => id !== ticketId);
        if (isTauri) {
          await invoke("delete_plan_ticket", { projectId, ticketId });
          await invoke("set_plan_kanban_state", setPlanKanbanStatePayload(projectId, inProgressIds));
        } else {
          const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, { method: "DELETE" });
          if (!res.ok) throw new Error((await res.json()).error || "Failed to delete");
          await fetch(`/api/data/projects/${projectId}/kanban-state`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inProgressIds }),
          });
        }
        const updatedTickets = kanbanData.tickets.filter((t) => t.id !== ticketId);
        setKanbanData(applyInProgressState({ ...kanbanData, tickets: updatedTickets }, inProgressIds));
        toast.success(`Ticket #${ticket.number} archived.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [projectId, kanbanData, isTauri]
  );

  const handleMarkAllInProgressDone = useCallback(async () => {
    const ids = kanbanData?.columns?.in_progress?.items?.map((t) => t.id) ?? [];
    if (ids.length === 0) return;
    if (isTauri) {
      for (const ticketId of ids) {
        await invoke("update_plan_ticket", {
          projectId,
          ticketId,
          done: true,
          status: "Done",
        });
      }
    } else {
      for (const ticketId of ids) {
        const res = await fetch(`/api/data/projects/${projectId}/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: true, status: "Done" }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      }
    }
    await loadTicketsAndKanban();
  }, [projectId, kanbanData?.columns?.in_progress?.items, isTauri, loadTicketsAndKanban]);

  const runImplementAllForTickets = useRunStore((s) => s.runImplementAllForTickets);
  const handleRunInProgressTickets = useCallback(async () => {
    const repoPath = project.repoPath?.trim();
    const projectPath = repoPath ?? "";
    if (!projectPath) return;
    const tickets = kanbanData?.columns?.in_progress?.items ?? [];
    if (tickets.length === 0) {
      toast.error("No tickets in progress. Move tickets to In Progress in the Planner tab.");
      return;
    }
    try {
      const implementAllMd = repoPath
        ? (await readProjectFileOrEmpty(projectId, WORKER_IMPLEMENT_ALL_PROMPT_PATH, repoPath))?.trim() ?? ""
        : "";
      let gitRefAtStart = "";
      if (isTauri) {
        try {
          gitRefAtStart = (await invoke<string>("get_git_head", { projectPath })) ?? "";
        } catch {
          /* ignore */
        }
      }
      const slots: Array<{
        slot: number;
        promptContent: string;
        label: string;
        meta?: {
          projectId: string;
          repoPath: string;
          ticketId: string;
          ticketNumber: number;
          ticketTitle: string;
          milestoneId?: number;
          ideaId?: number;
          gitRefAtStart?: string;
        };
      }> = [];
      const allAgentsBlock = await loadAllAgentsContent(projectId, repoPath ?? "");
      const ticketsToRun = tickets.slice(0, MAX_TERMINAL_SLOTS);
      for (let i = 0; i < ticketsToRun.length; i++) {
        const ticket = ticketsToRun[i];
        const slot = i + 1;
        let agentMd: string | null = null;
        if (ticket.agents?.length && repoPath) {
          const parts: string[] = [];
          for (const agentId of ticket.agents) {
            const content = await readProjectFileOrEmpty(
              projectId,
              `${AGENTS_ROOT}/${agentId}.md`,
              repoPath
            );
            if (content?.trim()) parts.push(content.trim());
          }
          if (parts.length) agentMd = parts.join("\n\n---\n\n");
        }
        const ticketBlock = buildTicketPromptBlock(ticket, agentMd);
        const baseContent = (implementAllMd
          ? `${implementAllMd}\n\n---\n\n${ticketBlock}`
          : ticketBlock
        ).trim();
        const promptContent = (baseContent + allAgentsBlock).trim() || ticketBlock.trim();
        slots.push({
          slot,
          promptContent,
          label: `Ticket #${ticket.number}: ${ticket.title}`,
          meta: {
            projectId,
            repoPath: repoPath ?? "",
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            ticketTitle: ticket.title,
            milestoneId: ticket.milestoneId,
            ideaId: ticket.ideaId,
            gitRefAtStart: gitRefAtStart || undefined,
          },
        });
      }
      await runImplementAllForTickets(projectPath, slots);
      toast.success(`${slots.length} ticket run(s) started. Check the terminals below.`);
    } catch {
      toast.error("Failed to start run.");
    }
  }, [projectId, project.repoPath, kanbanData, runImplementAllForTickets]);

  if (!project.repoPath?.trim()) {
    return (
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-sky-500/[0.03] p-8 backdrop-blur-sm">
        <EmptyState
          icon={<Terminal className="h-8 w-8 text-muted-foreground" />}
          title="No repo path"
          description="Set a repo path for this project in Setup to run and view terminals here."
        />
      </div>
    );
  }

  if (kanbanLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card-tint-1/90 p-8 backdrop-blur-sm">
        <LoadingState />
      </div>
    );
  }

  if (kanbanError) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card-tint-2/90 p-8 backdrop-blur-sm">
        <ErrorDisplay message={kanbanError} />
      </div>
    );
  }

  if (!isTauri) {
    return (
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-sky-500/[0.03] p-8 backdrop-blur-sm">
        <EmptyState
          icon={<Terminal className="h-8 w-8 text-muted-foreground" />}
          title="Run in Tauri"
          description="Terminals and Implement All are available when running the app in Tauri (desktop)."
        />
      </div>
    );
  }

  const workerApps = [
    {
      id: "agents",
      label: "Agents",
      icon: Plug,
      accent: {
        icon: "text-cyan-400",
        iconBg: "bg-cyan-500/12 border-cyan-500/40",
        active: "bg-cyan-500/12 border-cyan-500/45 shadow-sm",
      },
      render: () => (
        <ProjectWorkerAgentsSection
          project={project}
          projectId={projectId}
          projectPath={project.repoPath?.trim() ?? ""}
          agentProvider={agentProvider}
          nightShiftContent={
            <WorkerNightShiftSection
              projectId={projectId}
              projectPath={project.repoPath?.trim() ?? ""}
              project={project}
              agentProvider={agentProvider}
            />
          }
        />
      ),
    },
    {
      id: "vibing",
      label: "Vibing",
      icon: Sparkles,
      accent: {
        icon: "text-fuchsia-400",
        iconBg: "bg-fuchsia-500/12 border-fuchsia-500/40",
        active: "bg-fuchsia-500/12 border-fuchsia-500/45 shadow-sm",
      },
      render: () => (
        <WorkerVibingSection
          project={project}
          projectId={projectId}
          projectPath={project.repoPath?.trim() ?? ""}
          repoPath={project.repoPath ?? ""}
          onTicketCreated={loadTicketsAndKanban}
          agentProvider={agentProvider}
        />
      ),
    },
    {
      id: "enhancements",
      label: "Quality",
      icon: Settings2,
      accent: {
        icon: "text-violet-400",
        iconBg: "bg-violet-500/12 border-violet-500/40",
        active: "bg-violet-500/12 border-violet-500/45 shadow-sm",
      },
      render: () => (
        <WorkerEnhancementsSection
          projectId={projectId}
          repoPath={project.repoPath ?? ""}
          project={project}
          agentProvider={agentProvider}
        />
      ),
    },
    {
      id: "terminal-output",
      label: TERMINAL_TOP_APP_LABEL,
      icon: Terminal,
      accent: {
        icon: "text-sky-400",
        iconBg: "bg-sky-500/12 border-sky-500/40",
        active: "bg-sky-500/12 border-sky-500/45 shadow-sm",
      },
      render: () => (
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500/[0.12] via-cyan-500/[0.08] to-emerald-500/[0.1]">
          <div className="px-5 pt-5 pb-5">
            <Tabs defaultValue="terminals" className="w-full">
              <TabsList className="flex w-full h-9 rounded-lg bg-teal-500/[0.12] p-1 gap-0.5">
                <TabsTrigger value="terminals" className="flex-1 min-w-0 text-xs rounded-md inline-flex items-center justify-center gap-1.5">
                  Terminals
                  {runningTerminalCount > 0 && (
                    <span className="inline-flex items-center justify-center size-4 rounded-full bg-sky-500/25 text-sky-400 text-[10px] font-semibold tabular-nums shrink-0">
                      {runningTerminalCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="queue" className="flex-1 min-w-0 text-xs rounded-md truncate">
                  Queue
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 min-w-0 text-xs rounded-md truncate">
                  History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="terminals" className="mt-4 px-0 pt-0">
                <WorkerTerminalsSection
                  kanbanData={kanbanData}
                  projectId={projectId}
                  projectPath={project.repoPath?.trim() ?? ""}
                  repoPath={project.repoPath ?? ""}
                  handleMarkDone={handleMarkDone}
                  handleRedo={handleRedo}
                  handleArchive={handleArchive}
                  embedded
                />
              </TabsContent>
              <TabsContent value="queue" className="mt-4 px-0 pt-0">
                <WorkerGeneralQueueSection
                  projectId={projectId}
                  repoPath={project.repoPath ?? ""}
                  projectPath={project.repoPath?.trim() ?? ""}
                  kanbanData={kanbanData}
                  onRunInProgress={handleRunInProgressTickets}
                  onMarkAllInProgressDone={handleMarkAllInProgressDone}
                  embedded
                />
              </TabsContent>
              <TabsContent value="history" className="mt-4 px-0 pt-0">
                <WorkerHistorySection embedded />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ),
    },
  ] as const;
  const topWorkerApps = workerApps.filter((app) =>
    WORKER_TOP_APP_IDS.includes(app.id)
  );
  const openWorkerAppSections = topWorkerApps.filter((app) => openWorkerApps.includes(app.id));

  return (
    <div className="flex flex-col gap-5">
      {!isTauri && (
        <div className="rounded-xl bg-amber-500/12 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Worker agents require the desktop app.</strong> Run the app with Tauri (e.g. <code className="rounded bg-amber-500/20 px-1">npm run tauri dev</code> from the repo or install the desktop build) to use Asking, Plan, Fast development, Debugging, and Night shift.
        </div>
      )}
      <div className="rounded-2xl bg-gradient-to-br from-card/85 via-card/80 to-indigo-500/[0.08] p-4">
        <div className={WORKER_TOP_APPS_ROW_CLASSNAME}>
          {topWorkerApps.map((app) => {
            const Icon = app.icon;
            const isActive = openWorkerApps.includes(app.id);
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setOpenWorkerApps((prev) => toggleWorkerRunSection(prev, app.id))}
                className={cn(getWorkerTopAppButtonClassName(isActive, app.accent.active))}
                aria-pressed={isActive}
              >
                <span
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-xl border-0",
                    getWorkerTopAppIconWrapClassName(isActive, app.accent.iconBg)
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      isActive ? "text-white" : app.accent.icon,
                      !isActive && "opacity-90 group-hover:opacity-100"
                    )}
                  />
                </span>
                <span className="text-[11px] font-medium leading-tight text-center">
                  {app.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {openWorkerAppSections.length > 0 && (
        <div className={getWorkerRunSectionsGridClassName(openWorkerAppSections.length)}>
          {openWorkerAppSections.map((section) => (
            <div key={section.id} className={WORKER_RUN_SECTION_CARD_CLASSNAME}>
              {section.render()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   History — table of all agent terminal outputs
   ═══════════════════════════════════════════════════════════════════════════ */

const OUTPUT_PREVIEW_LEN = 80;

type HistorySortOrder = "newest" | "oldest" | "shortest" | "longest";
type ExitStatusFilter = "all" | "success" | "failed";
type DateRangeFilter = "all" | "24h" | "7d" | "30d";
const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
const MS_30D = 30 * MS_24H;

const FILTER_QUERY_DEBOUNCE_MS = 400;

function WorkerHistorySection({ embedded = false }: { embedded?: boolean } = {}) {
  const history = useRunStore((s) => s.terminalOutputHistory);
  const clearTerminalOutputHistory = useRunStore((s) => s.clearTerminalOutputHistory);
  const removeTerminalOutputFromHistory = useRunStore((s) => s.removeTerminalOutputFromHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [removeLastRunConfirmOpen, setRemoveLastRunConfirmOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState(() => getRunHistoryPreferences().filterQuery);
  const filterInputRef = useRef<HTMLInputElement>(null);
  useRunHistoryFocusFilterShortcut(filterInputRef);
  const [exitStatusFilter, setExitStatusFilter] = useState<ExitStatusFilter>(() => getRunHistoryPreferences().exitStatusFilter);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(() => getRunHistoryPreferences().dateRangeFilter);
  const [slotFilter, setSlotFilter] = useState<StoredSlotFilter>(() => getRunHistoryPreferences().slotFilter);
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>(() => getRunHistoryPreferences().sortOrder);
  useEffect(() => {
    setRunHistoryPreferences({ sortOrder, exitStatusFilter, dateRangeFilter, slotFilter });
  }, [sortOrder, exitStatusFilter, dateRangeFilter, slotFilter]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setRunHistoryPreferences({ filterQuery: filterQuery.trim().slice(0, RUN_HISTORY_FILTER_QUERY_MAX_LEN) });
    }, FILTER_QUERY_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filterQuery]);
  useEffect(() => {
    const onRestored = () => {
      setSortOrder(DEFAULT_RUN_HISTORY_PREFERENCES.sortOrder);
      setExitStatusFilter(DEFAULT_RUN_HISTORY_PREFERENCES.exitStatusFilter);
      setDateRangeFilter(DEFAULT_RUN_HISTORY_PREFERENCES.dateRangeFilter);
      setSlotFilter(DEFAULT_RUN_HISTORY_PREFERENCES.slotFilter);
      setFilterQuery(DEFAULT_RUN_HISTORY_PREFERENCES.filterQuery);
    };
    window.addEventListener(RUN_HISTORY_PREFERENCES_RESTORED_EVENT, onRestored);
    return () => window.removeEventListener(RUN_HISTORY_PREFERENCES_RESTORED_EVENT, onRestored);
  }, []);
  const trimmedQuery = filterQuery.trim().toLowerCase();
  const isNonDefaultPreferences =
    sortOrder !== DEFAULT_RUN_HISTORY_PREFERENCES.sortOrder ||
    exitStatusFilter !== DEFAULT_RUN_HISTORY_PREFERENCES.exitStatusFilter ||
    dateRangeFilter !== DEFAULT_RUN_HISTORY_PREFERENCES.dateRangeFilter ||
    slotFilter !== DEFAULT_RUN_HISTORY_PREFERENCES.slotFilter ||
    filterQuery !== DEFAULT_RUN_HISTORY_PREFERENCES.filterQuery;
  const filteredHistory = useMemo(() => {
    const byLabel = filterRunHistoryByQuery(history, filterQuery);
    let byStatus = byLabel;
    if (exitStatusFilter === "success") byStatus = byLabel.filter((h) => h.exitCode === 0);
    else if (exitStatusFilter === "failed") byStatus = byLabel.filter((h) => h.exitCode !== undefined && h.exitCode !== 0);
    let byDate = byStatus;
    if (dateRangeFilter !== "all") {
      const now = Date.now();
      const cutoff = dateRangeFilter === "24h" ? now - MS_24H : dateRangeFilter === "7d" ? now - MS_7D : now - MS_30D;
      byDate = byStatus.filter((h) => {
        try {
          const t = new Date(h.timestamp).getTime();
          return Number.isFinite(t) && t >= cutoff;
        } catch {
          return false;
        }
      });
    }
    if (slotFilter === "all") return byDate;
    const slotNum = Number(slotFilter);
    return byDate.filter((h) => h.slot === slotNum);
  }, [history, filterQuery, exitStatusFilter, dateRangeFilter, slotFilter]);
  const displayHistory = useMemo(() => {
    if (sortOrder === "oldest") return [...filteredHistory].reverse();
    if (sortOrder === "shortest") {
      return [...filteredHistory].sort((a, b) => {
        const am = a.durationMs ?? Infinity;
        const bm = b.durationMs ?? Infinity;
        return am - bm;
      });
    }
    if (sortOrder === "longest") {
      return [...filteredHistory].sort((a, b) => {
        const am = a.durationMs ?? -1;
        const bm = b.durationMs ?? -1;
        return bm - am;
      });
    }
    return filteredHistory;
  }, [filteredHistory, sortOrder]);
  const groupedByDate = useMemo(() => groupRunHistoryByDate(displayHistory), [displayHistory]);
  const historyStats = useMemo(() => computeRunHistoryStats(displayHistory), [displayHistory]);
  const historyStatsToolbarText = formatRunHistoryStatsToolbar(historyStats);
  const lastRun = useMemo(() => {
    if (history.length === 0) return null;
    return [...history].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))[0] ?? null;
  }, [history]);
  const entry = expandedId ? history.find((e) => e.id === expandedId) : null;

  const historyContent = (
    <>
      <div className={cn("flex flex-wrap items-center justify-between gap-3", embedded ? "py-2" : "px-5 py-4")}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 rounded-lg bg-slate-500/10">
            <History className="size-3.5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">History</h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Outputs of completed agent runs
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <PrintButton
              title="Print run tab (⌘P)"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              iconClassName="size-3"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!lastRun}
              onClick={() => lastRun && copySingleRunAsPlainTextToClipboard(lastRun)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={lastRun ? "Copy most recent run to clipboard" : "No run to copy"}
              aria-label="Copy last run to clipboard"
            >
              <Copy className="size-3" />
              Copy last run
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!lastRun}
              onClick={() => lastRun && downloadSingleRunAsPlainText(lastRun)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={lastRun ? "Download most recent run as file" : "No run to download"}
              aria-label="Download last run as file"
            >
              <Download className="size-3" />
              Download last run
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!lastRun}
              onClick={() => lastRun && setRemoveLastRunConfirmOpen(true)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={lastRun ? "Remove most recent run from history" : "No run to remove"}
              aria-label="Remove last run from history"
            >
              <Trash2 className="size-3" />
              Remove last run
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={displayHistory.length === 0}
              onClick={() => copyRunHistoryStatsSummaryToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={displayHistory.length > 0 ? "Copy run history stats summary to clipboard" : "No run history to copy"}
              aria-label="Copy run history stats summary to clipboard"
            >
              <Copy className="size-3" />
              Copy summary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={displayHistory.length === 0}
              onClick={() => downloadRunHistoryStatsAsJson(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={displayHistory.length > 0 ? "Export run history stats as JSON file" : "No runs to export"}
              aria-label="Download run history stats as JSON"
            >
              <FileJson className="size-3" />
              Download stats as JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={displayHistory.length === 0}
              onClick={() => void copyRunHistoryStatsAsJsonToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={displayHistory.length > 0 ? "Copy run history stats as JSON to clipboard" : "No runs to copy"}
              aria-label="Copy run history stats as JSON to clipboard"
            >
              <FileJson className="size-3" />
              Copy stats as JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={displayHistory.length === 0}
              onClick={() => downloadRunHistoryStatsAsCsv(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={displayHistory.length > 0 ? "Export run history stats as CSV file" : "No runs to export"}
              aria-label="Download run history stats as CSV"
            >
              <FileSpreadsheet className="size-3" />
              Download stats as CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={displayHistory.length === 0}
              onClick={() => void copyRunHistoryStatsAsCsvToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={displayHistory.length > 0 ? "Copy run history stats as CSV to clipboard" : "No runs to copy"}
              aria-label="Copy run history stats as CSV to clipboard"
            >
              <FileSpreadsheet className="size-3" />
              Copy stats as CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAllRunHistoryToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Copy visible run history to clipboard (plain text)"
              aria-label="Copy visible run history to clipboard (plain text)"
            >
              <Copy className="size-3" />
              Copy all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAllRunHistoryMarkdownToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Copy visible run history as Markdown to clipboard"
              aria-label="Copy visible run history as Markdown to clipboard"
            >
              <FileText className="size-3" />
              Copy as Markdown
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copyAllRunHistoryJsonToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Copy visible run history as JSON (same data as Download as JSON)"
              aria-label="Copy visible run history as JSON to clipboard"
            >
              <Copy className="size-3" />
              Copy as JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copyAllRunHistoryCsvToClipboard(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Copy visible run history as CSV (same data as Download as CSV)"
              aria-label="Copy visible run history as CSV to clipboard"
            >
              <Copy className="size-3" />
              Copy as CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadAllRunHistory(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Export visible run history as one file"
              aria-label="Export visible run history as one file"
            >
              <Download className="size-3" />
              Download all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadAllRunHistoryCsv(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Export visible run history as CSV"
              aria-label="Export visible run history as CSV"
            >
              <Download className="size-3" />
              Download as CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadAllRunHistoryJson(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Export visible run history as JSON"
              aria-label="Export visible run history as JSON"
            >
              <FileJson className="size-3" />
              Download as JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadAllRunHistoryMarkdown(displayHistory)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Export visible run history as Markdown"
              aria-label="Export visible run history as Markdown"
            >
              <FileText className="size-3" />
              Download as Markdown
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearConfirmOpen(true)}
              className="gap-1.5 text-xs h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="size-3" />
              Clear history
            </Button>
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No runs yet. Completed terminal runs will appear here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" aria-hidden />
                <Input
                  ref={filterInputRef}
                  type="text"
                  placeholder="Filter by label or output…"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  aria-label="Filter run history by label"
                />
              </div>
              {trimmedQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterQuery("")}
                  className="h-8 gap-1.5 text-xs"
                  aria-label="Clear filter"
                >
                  <X className="size-3.5" aria-hidden />
                  Clear
                </Button>
              )}
              <Select value={exitStatusFilter} onValueChange={(v) => setExitStatusFilter(v as ExitStatusFilter)}>
                <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="Filter run history by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All</SelectItem>
                  <SelectItem value="success" className="text-xs">Success</SelectItem>
                  <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as HistorySortOrder)}>
                <SelectTrigger className="h-8 min-w-[140px] w-[140px] text-xs" aria-label="Sort run history">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-xs">Newest first</SelectItem>
                  <SelectItem value="oldest" className="text-xs">Oldest first</SelectItem>
                  <SelectItem value="shortest" className="text-xs">Shortest first</SelectItem>
                  <SelectItem value="longest" className="text-xs">Longest first</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Filter run history by date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All time</SelectItem>
                  <SelectItem value="24h" className="text-xs">Last 24 hours</SelectItem>
                  <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                  <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={slotFilter} onValueChange={(v) => setSlotFilter(v as StoredSlotFilter)}>
                <SelectTrigger className="h-8 w-[100px] text-xs" aria-label="Filter run history by slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_SLOT_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {value === "all" ? "All slots" : `Slot ${value}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(trimmedQuery || exitStatusFilter !== "all" || dateRangeFilter !== "all" || slotFilter !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterQuery("");
                    setExitStatusFilter("all");
                    setDateRangeFilter("all");
                    setSlotFilter("all");
                  }}
                  className="h-8 gap-1.5 text-xs"
                  aria-label="Reset all filters"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset filters
                </Button>
              )}
              {isNonDefaultPreferences && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortOrder(DEFAULT_RUN_HISTORY_PREFERENCES.sortOrder);
                    setExitStatusFilter(DEFAULT_RUN_HISTORY_PREFERENCES.exitStatusFilter);
                    setDateRangeFilter(DEFAULT_RUN_HISTORY_PREFERENCES.dateRangeFilter);
                    setSlotFilter(DEFAULT_RUN_HISTORY_PREFERENCES.slotFilter);
                    setFilterQuery(DEFAULT_RUN_HISTORY_PREFERENCES.filterQuery);
                    setRunHistoryPreferences(DEFAULT_RUN_HISTORY_PREFERENCES);
                    toast.success("Preferences restored to defaults.");
                  }}
                  className="h-8 gap-1.5 text-xs"
                  aria-label="Restore default sort and filter preferences"
                  title="Restore default sort and filter preferences (and persist)"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Restore defaults
                </Button>
              )}
              {(trimmedQuery || exitStatusFilter !== "all" || dateRangeFilter !== "all" || slotFilter !== "all") && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Showing {filteredHistory.length} of {history.length} runs
                </span>
              )}
              {historyStatsToolbarText && (
                <span className="text-xs text-muted-foreground whitespace-nowrap" title={historyStatsToolbarText}>
                  {historyStatsToolbarText}
                </span>
              )}
            </div>
            {filteredHistory.length > 0 ? (
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[140px]">Time</TableHead>
                      <TableHead className="min-w-[160px]">Label</TableHead>
                      <TableHead className="w-14">Slot</TableHead>
                      <TableHead className="w-14">Exit</TableHead>
                      <TableHead className="w-16">Duration</TableHead>
                      <TableHead>Output (preview)</TableHead>
                      <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRunHistoryDateGroupOrder().map((groupKey) => {
                      const entries = groupedByDate[groupKey];
                      if (entries.length === 0) return null;
                      return (
                        <Fragment key={groupKey}>
                          <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="text-xs font-semibold text-muted-foreground py-2.5 px-4" title={getRunHistoryDateGroupTitle(groupKey)}>
                              {RUN_HISTORY_DATE_GROUP_LABELS[groupKey]}
                            </TableCell>
                          </TableRow>
                          {entries.map((h) => {
                            const preview = h.output.trim().slice(0, OUTPUT_PREVIEW_LEN);
                            const hasMore = h.output.trim().length > OUTPUT_PREVIEW_LEN;
                            return (
                              <TableRow key={h.id} className="group">
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                  <RelativeTimeWithTooltip timestamp={h.timestamp} className="font-mono" />
                                </TableCell>
                                <TableCell className="text-xs font-medium truncate max-w-[200px]" title={h.label}>
                                  {h.label}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {h.slot != null ? `T${h.slot}` : "—"}
                                </TableCell>
                                <TableCell>
                                  {h.exitCode !== undefined ? (
                                    <span className={cn(
                                      "text-xs font-mono px-1.5 py-0.5 rounded",
                                      h.exitCode === 0 ? "bg-sky-500/20 text-sky-600 dark:text-sky-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                                    )}>
                                      {h.exitCode}
                                    </span>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                  {h.durationMs != null && h.durationMs >= 0
                                    ? h.durationMs < 1000
                                      ? "<1s"
                                      : formatElapsed(h.durationMs / 1000)
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono max-w-[280px] truncate" title={preview}>
                                  {preview}{hasMore ? "…" : ""}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1 opacity-70 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        removeTerminalOutputFromHistory(h.id);
                                        toast.success("Run removed from history");
                                      }}
                                      title="Remove from history"
                                    >
                                      <Trash2 className="size-3" />
                                      Remove
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1 opacity-70 group-hover:opacity-100"
                                      onClick={() => setExpandedId(h.id)}
                                    >
                                      <ChevronDown className="size-3 rotate-[-90deg]" />
                                      Full
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : trimmedQuery ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No runs match &quot;{filterQuery.trim()}&quot;.
              </p>
            ) : dateRangeFilter !== "all" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No runs in this date range.
              </p>
            ) : exitStatusFilter === "success" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No successful runs.
              </p>
            ) : exitStatusFilter === "failed" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No failed runs.
              </p>
            ) : slotFilter !== "all" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No runs in Slot {slotFilter}.
              </p>
            ) : null}
          </>
        )}
      </div>

      <Dialog open={!!expandedId} onOpenChange={(open) => !open && setExpandedId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold truncate pr-8">
              {entry?.label ?? "Output"}
            </DialogTitle>
          </DialogHeader>
          {entry && (
            <>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    removeTerminalOutputFromHistory(entry.id);
                    setExpandedId(null);
                    toast.success("Run removed from history");
                  }}
                  title="Remove from history"
                >
                  <Trash2 className="size-3.5" />
                  Remove from history
                </Button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg bg-muted/50 p-4 text-xs font-mono whitespace-pre-wrap border border-border/40">
                {entry.output || "(no output)"}
              </pre>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear run history?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {history.length === 1
              ? "1 run will be removed from history. This cannot be undone."
              : `${history.length} runs will be removed from history. This cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearTerminalOutputHistory();
                setClearConfirmOpen(false);
                toast.success("History cleared");
              }}
            >
              Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeLastRunConfirmOpen} onOpenChange={setRemoveLastRunConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove last run from history?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The most recent run will be removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveLastRunConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (lastRun) {
                  removeTerminalOutputFromHistory(lastRun.id);
                  setRemoveLastRunConfirmOpen(false);
                  toast.success("Last run removed from history");
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) return historyContent;

  return (
    <div className="rounded-2xl surface-card border border-border/50 overflow-hidden bg-gradient-to-r from-slate-500/[0.08] via-zinc-500/[0.06] to-stone-500/[0.08]">
      {historyContent}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Status Bar — live overview of running terminals
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerStatusBar() {
  const runningRuns = useRunStore((s) => s.runningRuns);
  const pendingQueueLength = useRunStore((s) => s.pendingTempTicketQueue.length);
  const clearPendingTempTicketQueue = useRunStore((s) => s.clearPendingTempTicketQueue);
  const implementAllRuns = runningRuns.filter(isImplementAllRun);
  const runningCount = implementAllRuns.filter((r) => r.status === "running").length;
  const doneCount = implementAllRuns.filter((r) => r.status === "done").length;
  const totalCount = implementAllRuns.length;

  const handleClearQueue = () => {
    clearPendingTempTicketQueue();
    toast.success("Queue cleared. All queued tasks removed.");
  };

  return (
    <div className={cn("relative p-5 backdrop-blur-sm", WORKER_RUN_SECTION_SURFACE_CLASSNAME.status)}>
      {/* Decorative orb */}
      <div className="absolute -top-12 -right-12 size-32 rounded-full bg-sky-500/[0.08] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 size-24 rounded-full bg-teal-500/[0.06] blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center size-9 rounded-xl transition-all duration-500",
            runningCount > 0
              ? "bg-sky-500/20 shadow-lg shadow-sky-500/10"
              : "bg-muted/40"
          )}>
            <Activity className={cn(
              "size-4.5 transition-colors duration-300",
              runningCount > 0 ? "text-sky-400 animate-pulse" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Worker
            </h2>
            <p className="text-[11px] text-muted-foreground normal-case">
              {runningCount > 0
                ? `${runningCount} terminal${runningCount > 1 ? "s" : ""} running`
                : totalCount > 0
                  ? "All terminals idle"
                  : "No runs yet"}
            </p>
          </div>
        </div>

        {/* Status pills + Clear queue */}
        <div className="flex items-center gap-2">
          {pendingQueueLength > 0 && (
            <>
              <StatusPill
                icon={<Circle className="size-3" />}
                label="Queued"
                count={pendingQueueLength}
                color="violet"
                pulse
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                className="h-7 gap-1.5 text-xs rounded-lg border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/60"
                title="Clear all queued tasks"
                aria-label="Clear all queued tasks"
              >
                <X className="size-3" />
                Clear queue
              </Button>
            </>
          )}
          {totalCount > 0 && (
            <>
              <StatusPill
                icon={<Zap className="size-3" />}
                label="Running"
                count={runningCount}
                color={runningCount > 0 ? "sky" : "muted"}
                pulse={runningCount > 0}
              />
              <StatusPill
                icon={<CheckCircle2 className="size-3" />}
                label="Done"
                count={doneCount}
                color={doneCount > 0 ? "sky" : "muted"}
              />
              <StatusPill
                icon={<Circle className="size-3" />}
                label="Total"
                count={totalCount}
                color="muted"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pending queue — list of queued tasks with delete per entry
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerPendingQueueSection() {
  const pendingQueue = useRunStore((s) => s.pendingTempTicketQueue);
  const removeFromPendingTempTicketQueue = useRunStore((s) => s.removeFromPendingTempTicketQueue);

  if (pendingQueue.length === 0) return null;

  return (
    <div className={cn("surface-card", WORKER_RUN_SECTION_SURFACE_CLASSNAME.queue)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 rounded-lg bg-violet-500/10">
            <ListTodo className="size-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">Queued tasks</h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Waiting for a free terminal slot — remove entries below or clear all in the bar above
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 pt-0">
        <ul className="space-y-1.5">
          {pendingQueue.map((job, index) => (
            <li key={index} className="flex items-center gap-2 text-xs group">
              <span className="flex-1 min-w-0 font-medium text-foreground/90 truncate" title={job.label}>
                {job.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 opacity-70 hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  removeFromPendingTempTicketQueue(index);
                  toast.success("Removed from queue.");
                }}
                title="Remove from queue"
                aria-label="Remove from queue"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* StatusPill is now imported from @/components/shared/DisplayPrimitives */

/* ═══════════════════════════════════════════════════════════════════════════
   Fast development — type command, run agent immediately
   ═══════════════════════════════════════════════════════════════════════════ */

const FAST_DEV_PROMPT_PREFIX = "Do the following in this project. Be concise and execute.\n\n";

/** Prefix for asking section: agent must never create, modify, or delete files; only answer. */
const ASK_ONLY_PROMPT_PREFIX = "You are in ask-only mode. Do NOT create, modify, or delete any files. Only answer the following question using the project context. You may use the terminal to run read-only commands (e.g. list, grep, cat) if needed.\n\n";

function WorkerAskingSection({ projectId, projectPath, agentProvider = "cursor" }: { projectId: string; projectPath: string; agentProvider?: "cursor" | "claude" | "gemini" }) {
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const addPlaceholderAskRun = useRunStore((s) => s.addPlaceholderAskRun);
  const terminalOutputHistory = useRunStore((s) => s.terminalOutputHistory);
  const latestAskRun = useMemo(
    () => terminalOutputHistory.find((e) => e.label.startsWith("Ask:")),
    [terminalOutputHistory]
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    const text = question.trim();
    if (!text) {
      toast.error("Enter a question above, then run the agent.");
      return;
    }
    if (!projectPath?.trim()) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    const labelSuffix = text.length > 40 ? `${text.slice(0, 37)}…` : text;
    const label = `Ask: ${labelSuffix}`;
    // #region agent log
    debugIngest({ sessionId: "415745", location: "ProjectRunTab.tsx:handleAsk:start", message: "Ask button clicked", data: { projectId, projectPath: projectPath?.slice(0, 80), textLen: text.length, label }, timestamp: Date.now(), hypothesisId: "H1" }, { "X-Debug-Session-Id": "415745" });
    // #endregion
    const placeholderRunId = addPlaceholderAskRun(label);
    setQuestion("");
    setLoading(true);
    try {
      const agentsBlock = await loadAllAgentsContent(projectId, projectPath);
      // #region agent log
      debugIngest({ sessionId: "415745", location: "ProjectRunTab.tsx:handleAsk:beforeRunTempTicket", message: "About to call runTempTicket", data: { placeholderRunId, agentsBlockLen: agentsBlock.length, agentMode: "ask" }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "415745" });
      // #endregion
      const fullPrompt = ASK_ONLY_PROMPT_PREFIX + text + agentsBlock;
      const runId = await runTempTicket(projectPath.trim(), fullPrompt, label, { ...(placeholderRunId ? { placeholderRunId } : {}), agentMode: "ask", provider: agentProvider });
      // #region agent log
      debugIngest({ sessionId: "415745", location: "ProjectRunTab.tsx:handleAsk:afterRunTempTicket", message: "runTempTicket returned", data: { runId }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "415745" });
      // #endregion
      if (runId) {
        toast.success(placeholderRunId ? "Agent started. Check the terminal below." : "Added to queue. Agent will start when a slot is free.");
      } else {
        toast.error("Failed to start agent.");
      }
    } catch (err) {
      // #region agent log
      debugIngest({ sessionId: "415745", location: "ProjectRunTab.tsx:handleAsk:catch", message: "handleAsk caught error", data: { error: err instanceof Error ? err.message : String(err) }, timestamp: Date.now(), hypothesisId: "H1" }, { "X-Debug-Session-Id": "415745" });
      // #endregion
      toast.error("Failed to start agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerAgentCard
      bgColor="bg-sky-500/[0.06]"
      iconBg="bg-sky-500/10"
      iconColor="text-sky-400"
      icon={MessageCircleQuestion}
      title="Asking"
      description="Ask questions about the project; the agent answers only (no file changes), using the terminal below"
      value={question}
      onChange={setQuestion}
      placeholder="e.g. Where is the login form defined?"
      buttonLabel="Ask"
      buttonTitle="Run the terminal agent in ask-only mode (same script as fast dev, no file edits)"
      onSubmit={handleAsk}
      loading={loading}
      disabled={!question.trim()}
    >
      {latestAskRun?.output != null && latestAskRun.output.trim() !== "" && (
        <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Last answer
              {latestAskRun.label !== "Ask:" ? ` — ${latestAskRun.label.replace(/^Ask: /, "")}` : ""}
            </span>
            {latestAskRun.timestamp && (
              <RelativeTimeWithTooltip
                timestamp={latestAskRun.timestamp}
                className="text-[10px] text-muted-foreground"
              />
            )}
          </div>
          <ScrollArea className="h-[min(320px,50vh)] w-full">
            <div className="px-3 py-3 pr-4 prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-pre:my-2 prose-pre:text-xs prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{latestAskRun.output.trim()}</ReactMarkdown>
            </div>
          </ScrollArea>
        </div>
      )}
    </WorkerAgentCard>
  );
}

function WorkerFastDevelopmentSection({
  projectId,
  projectPath,
  onTicketCreated,
  agentProvider = "cursor",
}: {
  projectId: string;
  projectPath: string;
  onTicketCreated: () => Promise<void>;
  agentProvider?: "cursor" | "claude" | "gemini";
}) {
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRunAgent = async () => {
    const text = command.trim();
    if (!text) {
      toast.error("Enter a command or task above, then run the agent.");
      return;
    }
    if (!projectPath?.trim()) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    setLoading(true);
    try {
      const agentsBlock = await loadAllAgentsContent(projectId, projectPath.trim());
      const fullPrompt = FAST_DEV_PROMPT_PREFIX + text + agentsBlock;
      const title = text.length > 120 ? `${text.slice(0, 117)}…` : text;

      const mils = await fetchProjectMilestones(projectId);
      const general = mils.find((m) => m.name === "General Development");
      const milestoneId = general?.id ?? mils[0]?.id;
      if (milestoneId == null) {
        toast.error("No milestone found. Add a milestone in the Milestones tab (e.g. General Development).");
        setLoading(false);
        return;
      }

      let newTicket: { id: string; number: number; title: string; milestone_id?: number };
      if (isTauri) {
        newTicket = await invoke<{ id: string; number: number; title: string; milestone_id?: number }>(
          "create_plan_ticket",
          createPlanTicketPayload({
            project_id: projectId,
            title,
            description: fullPrompt,
            priority: "P1",
            feature_name: "Fast development",
            milestone_id: milestoneId,
            idea_id: null,
            agents: null,
          })
        );
      } else {
        const createRes = await fetch(`/api/data/projects/${projectId}/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: fullPrompt,
            priority: "P1",
            feature_name: "Fast development",
            milestone_id: milestoneId,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error((err as { error?: string }).error ?? "Failed to create ticket");
        }
        newTicket = (await createRes.json()) as { id: string; number: number; title: string; milestone_id?: number };
      }

      let inProgressIds: string[];
      if (isTauri) {
        const state = await invoke<{ inProgressIds: string[] }>("get_project_kanban_state", projectIdArgPayload(projectId));
        inProgressIds = state?.inProgressIds ?? [];
      } else {
        const stateRes = await fetch(`/api/data/projects/${projectId}/kanban-state`);
        if (!stateRes.ok) throw new Error("Failed to load kanban state");
        const state = (await stateRes.json()) as { inProgressIds: string[] };
        inProgressIds = state.inProgressIds ?? [];
      }
      inProgressIds = [...inProgressIds.filter((id) => id !== newTicket.id), newTicket.id];
      if (isTauri) {
        await invoke("set_plan_kanban_state", setPlanKanbanStatePayload(projectId, inProgressIds));
      } else {
        const patchRes = await fetch(`/api/data/projects/${projectId}/kanban-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inProgressIds }),
        });
        if (!patchRes.ok) throw new Error("Failed to add ticket to queue");
      }

      await onTicketCreated();

      const label = `Ticket #${newTicket.number}: ${title.length > 40 ? `${title.slice(0, 37)}…` : title}`;
      const runId = await runTempTicket(projectPath.trim(), fullPrompt, label, {
        ticketId: newTicket.id,
        ticketNumber: newTicket.number,
        ticketTitle: newTicket.title,
        milestoneId: newTicket.milestone_id,
        provider: agentProvider,
      });
      if (runId) {
        toast.success(runId === "queued" ? "Ticket created and queued. Agent will start when a slot is free." : "Ticket created and agent started. Check the queue and terminal below.");
        setCommand("");
      } else {
        toast.error("Failed to start agent.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create ticket or start agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerAgentCard
      bgColor="bg-sky-500/[0.06]"
      iconBg="bg-sky-500/10"
      iconColor="text-sky-400"
      icon={Zap}
      title="Fast"
      description="Enter a command or task; the agent runs immediately in this project"
      value={command}
      onChange={setCommand}
      placeholder="e.g. Add a dark mode toggle to the header"
      buttonLabel="Run agent"
      buttonTitle="Run the terminal agent with this command (uses next free terminal slot)"
      onSubmit={handleRunAgent}
      loading={loading}
      disabled={!command.trim()}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Debugging — paste error logs, run terminal agent to fix
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerDebuggingSection({
  projectId,
  projectPath,
  repoPath,
  agentProvider = "cursor",
}: {
  projectId: string;
  projectPath: string;
  repoPath: string;
  agentProvider?: "cursor" | "claude" | "gemini";
}) {
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const runStaticAnalysisChecklist = useRunStore((s) => s.runStaticAnalysisChecklist);
  const isTauriEnv = useRunStore((s) => s.isTauriEnv);
  const lastStaticAnalysisReportByProject = useRunStore((s) => s.lastStaticAnalysisReportByProject);
  const [errorLogs, setErrorLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultContent, setResultContent] = useState<string | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [reportTab, setReportTab] = useState<"analysis" | "fix">("analysis");
  const [fixReportContent, setFixReportContent] = useState<string | null>(null);
  const [fixReportLoading, setFixReportLoading] = useState(false);
  const [fixRunning, setFixRunning] = useState(false);

  const hasReport = projectPath ? !!lastStaticAnalysisReportByProject[projectPath.trim()] : false;

  const handleApplyChecklist = async () => {
    if (!projectPath?.trim()) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    setChecklistModalOpen(false);
    setLoadingChecklist(true);
    try {
      let selectedToolIds: string[] | undefined;
      if (isTauri) {
        const res = await getProjectConfig(projectId, "static_analysis_tools");
        selectedToolIds = Array.isArray(res.config?.toolIds) ? (res.config.toolIds as string[]) : undefined;
      }
      if (isTauriEnv) {
        const runId = await runStaticAnalysisChecklist(projectPath.trim(), selectedToolIds);
        if (runId) {
          toast.success("Static analysis checklist started. Commands run directly in the project — check the terminal below.");
        }
      } else {
        const prompt = buildStaticAnalysisPrompt(selectedToolIds);
        const runId = await runTempTicket(projectPath.trim(), prompt, "Static analysis checklist", {
          provider: agentProvider,
        });
        if (runId) {
          toast.success(
            runId === "queued"
              ? "Static analysis checklist queued. Agent will run when a slot is free."
              : "Static analysis checklist started. Check the terminal below."
          );
        } else {
          toast.error("Failed to start static analysis checklist.");
        }
      }
    } catch {
      toast.error("Failed to start static analysis checklist.");
    } finally {
      setLoadingChecklist(false);
    }
  };

  const handleOpenResult = async () => {
    const path = projectPath?.trim();
    if (!path || !hasReport) return;
    setResultModalOpen(true);
    setResultLoading(true);
    setResultContent(null);
    setReportTab("analysis");
    try {
      if (isTauri) {
        const content = await invoke<string>("read_file_text_under_root", {
          root: path,
          path: STATIC_ANALYSIS_CHECKLIST.reportFile,
        });
        setResultContent(content ?? "");
      } else {
        const content = await readProjectFileOrEmpty(projectId, STATIC_ANALYSIS_CHECKLIST.reportFile, path);
        setResultContent(content ?? "");
      }
    } catch (e) {
      setResultContent(`Failed to load report: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResultLoading(false);
    }
  };

  const handleFixIssues = async () => {
    const path = projectPath?.trim();
    if (!path || resultContent === null || resultContent === "") {
      toast.error("Load the analysis report first.");
      return;
    }
    setFixRunning(true);
    try {
      const prompt = buildAnalysisFixPrompt(resultContent);
      const runId = await runTempTicket(path, prompt, "Analysis fix", { provider: agentProvider });
      if (runId) {
        toast.success(
          runId === "queued"
            ? "Fix run queued. When the agent finishes, click « Load fix report » in this modal."
            : "Fix run started. When done, click « Load fix report » to see the report."
        );
      } else {
        toast.error("Failed to start fix run.");
      }
    } catch {
      toast.error("Failed to start fix run.");
    } finally {
      setFixRunning(false);
    }
  };

  const handleLoadFixReport = async () => {
    const path = projectPath?.trim();
    if (!path) return;
    setFixReportLoading(true);
    setFixReportContent(null);
    try {
      let content: string;
      if (isTauri) {
        content = (await invoke<string>("read_file_text_under_root", {
          root: path,
          path: ANALYSIS_FIX_REPORT_FILE,
        })) ?? "";
      } else {
        content = (await readProjectFileOrEmpty(projectId, ANALYSIS_FIX_REPORT_FILE, path)) ?? "";
      }
      setFixReportContent(content);
      setReportTab("fix");
      if (content.trim()) toast.success("Fix report loaded.");
    } catch (e) {
      setFixReportContent(`Failed to load fix report: ${e instanceof Error ? e.message : String(e)}. The agent may still be running.`);
      setReportTab("fix");
    } finally {
      setFixReportLoading(false);
    }
  };

  const handleRunDebugAgent = async () => {
    const logs = errorLogs.trim();
    if (!logs) {
      toast.error("Paste error logs above, then run the agent.");
      return;
    }
    if (!projectPath?.trim()) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    setLoading(true);
    try {
      const fixBugMd =
        repoPath && projectId
          ? (await readProjectFileOrEmpty(projectId, WORKER_FIX_BUG_PROMPT_PATH, repoPath))?.trim()
          : "";
      const basePrompt = fixBugMd || DEBUG_ASSISTANT_PROMPT_FALLBACK;
      const promptWithLogs = basePrompt.endsWith("\n") ? basePrompt + logs : basePrompt + "\n\n" + logs;
      const agentsBlock = await loadAllAgentsContent(projectId, repoPath);
      const fullPrompt = (promptWithLogs + agentsBlock).trim();
      const firstLine = logs.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
      const label = firstLine ? `Debug: ${firstLine.slice(0, 50)}${firstLine.length > 50 ? "…" : ""}` : "Debug: fix errors";
      // Use default agent (no --mode): Cursor CLI --mode only supports agent|plan|ask; debug is editor-only and fails in headless.
      const runId = await runTempTicket(projectPath.trim(), fullPrompt, label, { provider: agentProvider });
      if (runId) {
        setErrorLogs("");
        toast.success(runId === "queued" ? "Added to queue. Agent will start when a slot is free." : "Debug agent started. Check the terminal below.");
      } else {
        toast.error("Failed to start debug agent.");
      }
    } catch {
      toast.error("Failed to start debug agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerAgentCard
      bgColor="bg-orange-500/[0.06]"
      iconBg="bg-orange-500/10"
      iconColor="text-orange-400"
      icon={Bug}
      title="Debugging"
      description="Paste error logs below; run the terminal agent to diagnose and fix (runs in this project)"
      value={errorLogs}
      onChange={setErrorLogs}
      placeholder="Paste error messages, stack traces, or build/runtime logs here…"
      buttonLabel="Run terminal agent to fix"
      buttonTitle="Runs the debugging prompt + your logs in the terminal agent (uses next free terminal slot)"
      onSubmit={handleRunDebugAgent}
      loading={loading}
      disabled={!errorLogs.trim()}
    >
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setChecklistModalOpen(true)}
          disabled={loadingChecklist || loading}
          className="gap-2"
          title="Show checklist and run static analysis (tsc, eslint, ruff, etc.); writes analysis-report.txt"
        >
          {loadingChecklist ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ListChecks className="size-4" />
          )}
          Apply static analysis checklist
        </Button>
        {hasReport && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenResult}
            className="gap-2"
            title="View the last analysis report in KWCode"
          >
            <FileOutput className="size-4" />
            Open result
          </Button>
        )}
      </div>

      {/* Checklist modal: all tools to run, then Run starts the run */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              {STATIC_ANALYSIS_CHECKLIST.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground shrink-0">
            {STATIC_ANALYSIS_CHECKLIST.description} Report: <code className="text-[10px] bg-muted px-1 rounded">{STATIC_ANALYSIS_CHECKLIST.reportFile}</code>
          </p>
          <ScrollArea className="h-[min(400px,50vh)] shrink-0 border rounded-md">
            <div className="p-3 pr-4">
              <ul className="space-y-3 text-xs">
                {STATIC_ANALYSIS_CHECKLIST.tools.map((t) => (
                  <li key={t.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="font-medium flex items-center gap-1.5">
                      {t.name}
                      {t.optional && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">optional</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      <span className="text-[10px]">install:</span> <code className="text-[10px] bg-muted/70 px-0.5 rounded">{t.installCommand}</code>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      <span className="text-[10px]">run:</span> <code className="text-[10px] bg-muted/70 px-0.5 rounded">{t.runCommand}</code>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">{t.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setChecklistModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleApplyChecklist()}
              disabled={loadingChecklist || !projectPath?.trim()}
            >
              {loadingChecklist ? <Loader2 className="size-4 animate-spin" /> : "Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result modal: view report content + fix report */}
      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileOutput className="size-4" />
              Analysis report
            </DialogTitle>
          </DialogHeader>
          {resultLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : resultContent !== null ? (
            <>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleFixIssues}
                  disabled={fixRunning || !resultContent.trim()}
                  title="Run the agent to fix the issues in this report and write a fix report"
                >
                  {fixRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wrench className="size-4" />
                  )}
                  <span className="ml-1.5">Fix issues from report</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadFixReport}
                  disabled={fixReportLoading}
                  title="Load the fix report written by the agent (analysis-fix-report.txt)"
                >
                  {fixReportLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileOutput className="size-4" />
                  )}
                  <span className="ml-1.5">Load fix report</span>
                </Button>
              </div>
              <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as "analysis" | "fix")} className="min-h-0 flex-1 flex flex-col">
                <TabsList className="shrink-0 w-full grid grid-cols-2">
                  <TabsTrigger value="analysis">Analysis report</TabsTrigger>
                  <TabsTrigger value="fix">Fix report</TabsTrigger>
                </TabsList>
                <TabsContent value="analysis" className="min-h-0 flex-1 mt-2 data-[state=inactive]:hidden flex flex-col">
                  <div className="min-h-0 flex-1 rounded-md border overflow-hidden">
                    <ScrollArea className="h-[50vh] rounded-md">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words p-3">
                        {resultContent}
                      </pre>
                    </ScrollArea>
                  </div>
                </TabsContent>
                <TabsContent value="fix" className="min-h-0 flex-1 mt-2 data-[state=inactive]:hidden flex flex-col">
                  <div className="min-h-0 flex-1 rounded-md border overflow-hidden">
                    {fixReportContent === null ? (
                      <div className="p-4 text-muted-foreground text-sm">
                        Run « Fix issues from report » first. When the agent has finished, click « Load fix report » to see what was fixed.
                      </div>
                    ) : (
                      <ScrollArea className="h-[50vh] rounded-md">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words p-3">
                          {fixReportContent}
                        </pre>
                      </ScrollArea>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </WorkerAgentCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Enhancements — category-based cleanup/refactor tools
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerEnhancementsSection({
  projectId,
  repoPath,
  project,
  agentProvider = "cursor",
}: {
  projectId: string;
  repoPath: string;
  project: Project | null;
  agentProvider?: "cursor" | "claude" | "gemini";
}) {
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const allToolIds = useMemo(() => getWorkerEnhancementToolIds(), []);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(allToolIds);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [savingTools, setSavingTools] = useState(false);
  const [runningQualityAudit, setRunningQualityAudit] = useState(false);

  useEffect(() => {
    if (!isTauri) {
      setSelectedToolIds(allToolIds);
      setConfigLoaded(true);
      return;
    }
    let cancelled = false;
    getProjectConfig(projectId, "cleanup_refactor_tools")
      .then((res) => {
        if (cancelled) return;
        const ids = sanitizeWorkerEnhancementToolIds(res.config?.toolIds);
        if (ids.length > 0) setSelectedToolIds(ids);
        setConfigLoaded(true);
      })
      .catch(() => setConfigLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [projectId, allToolIds]);

  const handleToolToggle = useCallback(
    (id: string, checked: boolean) => {
      const next = checked
        ? [...selectedToolIds, id].filter((x) => allToolIds.includes(x))
        : selectedToolIds.filter((x) => x !== id);
      setSelectedToolIds(next);
      if (isTauri) {
        setSavingTools(true);
        setProjectConfig(projectId, "cleanup_refactor_tools", { toolIds: next })
          .then(() => toast.success("Selected tools saved for this project."))
          .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to save"))
          .finally(() => setSavingTools(false));
      }
    },
    [projectId, selectedToolIds, allToolIds]
  );

  const handleRunQualityAudit = useCallback(async () => {
    const projectPath = repoPath?.trim();
    if (!projectPath) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    if (selectedToolIds.length === 0) {
      toast.error("Select at least one Quality item before running the audit.");
      return;
    }
    setRunningQualityAudit(true);
    try {
      const selectedLabels = getWorkerEnhancementToolLabelsByIds(selectedToolIds);
      const prompt = buildWorkerEnhancementsTestingPrompt(selectedLabels);
      const runId = await runTempTicket(projectPath, prompt, "Quality: audit selected items", {
        provider: agentProvider,
      });
      if (runId) {
        toast.success(
          runId === "queued"
            ? "Quality audit queued. Agent will start when a slot is free."
            : "Quality audit started. Check the terminal below."
        );
      } else {
        toast.error("Failed to start quality audit.");
      }
    } catch {
      toast.error("Failed to start quality audit.");
    } finally {
      setRunningQualityAudit(false);
    }
  }, [agentProvider, repoPath, runTempTicket, selectedToolIds]);

  return (
    <div className={WORKER_RUN_SECTION_SURFACE_CLASSNAME.enhancements}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 shrink-0 rounded-lg bg-violet-500/10">
            <Settings2 className="size-3.5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Quality
            </h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Cleanup and refactoring tool categories
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs defaultValue={WORKER_ENHANCEMENT_TOOL_CATEGORIES[0]?.id ?? "code-quality"} className="w-full">
          <TabsList className="flex w-full h-auto rounded-lg bg-violet-500/[0.12] p-1 gap-0.5 flex-wrap">
            {WORKER_ENHANCEMENT_TOOL_CATEGORIES.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="min-w-0 text-xs rounded-md truncate grow basis-[calc(50%-2px)] lg:basis-auto lg:flex-1"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {!configLoaded ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2 mt-4">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="space-y-2 mt-4">
                {!isTauri && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Tool selection is saved only in the desktop app. In browser, selection is for display.
                  </p>
                )}
                {savingTools && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    Saving…
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose cleanup and refactoring tool focus areas for this project.
                </p>
                <div className="rounded-md border border-violet-500/25 bg-violet-500/[0.08] p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      Quality audit report
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleRunQualityAudit()}
                      disabled={runningQualityAudit || !repoPath?.trim() || selectedToolIds.length === 0}
                      title="Run an agent that audits all checked Quality items and writes a scored report with suggestions"
                    >
                      {runningQualityAudit ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                      Run audit
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Audits all checked items from Code Quality through Code Refactoring and writes a scored report with findings and suggestions to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">quality-audit-report.md</code>.
                  </p>
                </div>
              </div>
              {WORKER_ENHANCEMENT_TOOL_CATEGORIES.map((category) => (
                <TabsContent key={category.id} value={category.id} className="mt-4 px-0 pt-0">
                  <ScrollArea className="h-[min(320px,45vh)] border rounded-md">
                    <div className="p-3 space-y-3">
                      {category.groups.map((group) => (
                        <div key={group.id} className="space-y-2">
                          {category.groups.length > 1 && (
                            <p className="text-xs font-semibold text-foreground">{group.label}</p>
                          )}
                          <ul className="space-y-2">
                            {group.items.map((item) => (
                              <li key={item.id} className="flex items-start gap-2">
                                <Checkbox
                                  id={`enh-tool-${item.id}`}
                                  checked={selectedToolIds.includes(item.id)}
                                  onCheckedChange={(checked) => handleToolToggle(item.id, checked === true)}
                                  className="mt-0.5"
                                />
                                <label htmlFor={`enh-tool-${item.id}`} className="text-xs cursor-pointer flex-1 min-w-0">
                                  <span className="font-medium">{item.label}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Vibing — section with tabs: Asking, Planning, Fast Development, Debugging
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkerVibingSection({
  project,
  projectId,
  projectPath,
  repoPath,
  onTicketCreated,
  agentProvider = "cursor",
}: {
  project: Project;
  projectId: string;
  projectPath: string;
  repoPath: string;
  onTicketCreated: () => Promise<void>;
  agentProvider?: "cursor" | "claude" | "gemini";
}) {
  return (
    <div className="rounded-2xl border border-cyan-500/20 overflow-hidden bg-gradient-to-br from-cyan-500/[0.12] via-indigo-500/[0.08] to-violet-500/[0.1]">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 shrink-0 rounded-lg bg-cyan-500/15">
            <Sparkles className="size-3.5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Vibing
            </h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Asking, Planning, Fast, Debugging
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs defaultValue="asking" className="w-full">
          <TabsList className="flex w-full h-9 rounded-lg bg-cyan-500/[0.1] p-1 gap-0.5">
            <TabsTrigger value="asking" className="flex-1 min-w-0 text-xs rounded-md truncate">
              Asking
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex-1 min-w-0 text-xs rounded-md truncate">
              Planning
            </TabsTrigger>
            <TabsTrigger value="fast" className="flex-1 min-w-0 text-xs rounded-md truncate">
              Fast
            </TabsTrigger>
            <TabsTrigger value="debugging" className="flex-1 min-w-0 text-xs rounded-md truncate">
              Debugging
            </TabsTrigger>
          </TabsList>
          <TabsContent value="asking" className="mt-4 px-0 pt-0">
            <WorkerAskingSection projectId={projectId} projectPath={projectPath} agentProvider={agentProvider} />
          </TabsContent>
          <TabsContent value="planning" className="mt-4 px-0 pt-0">
            <div className="rounded-2xl border border-cyan-500/25 overflow-hidden bg-cyan-500/[0.08]">
              <ProjectPlanTab project={project} projectId={projectId} agentProvider={agentProvider} />
            </div>
          </TabsContent>
          <TabsContent value="fast" className="mt-4 px-0 pt-0">
            <WorkerFastDevelopmentSection
              projectId={projectId}
              projectPath={projectPath}
              onTicketCreated={onTicketCreated}
              agentProvider={agentProvider}
            />
          </TabsContent>
          <TabsContent value="debugging" className="mt-4 px-0 pt-0">
            <WorkerDebuggingSection projectId={projectId} projectPath={projectPath} repoPath={repoPath} agentProvider={agentProvider} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Terminals Section — each terminal with its ticket directly below
   ═══════════════════════════════════════════════════════════════════════════ */

interface WorkerTerminalsSectionProps {
  kanbanData: TodosKanbanData | null;
  projectId: string;
  projectPath: string;
  repoPath: string;
  handleMarkDone: (id: string) => Promise<void>;
  handleRedo: (id: string) => Promise<void>;
  handleArchive: (id: string) => Promise<void>;
  embedded?: boolean;
}

function WorkerTerminalsSection({
  kanbanData,
  projectId,
  projectPath,
  repoPath,
  handleMarkDone,
  handleRedo,
  handleArchive,
  embedded = false,
}: WorkerTerminalsSectionProps) {
  const runningRuns = useRunStore((s) => s.runningRuns);
  const stopAllImplementAll = useRunStore((s) => s.stopAllImplementAll);
  const clearImplementAllLogs = useRunStore((s) => s.clearImplementAllLogs);
  const archiveImplementAllLogs = useRunStore((s) => s.archiveImplementAllLogs);

  const terminalRuns = runningRuns.filter((r) => r.slot != null);
  const unslottedRunningRuns = runningRuns.filter((r) => r.slot == null && r.status === "running");
  const anyRunning = runningRuns.some((r) => r.status === "running");

  const handleStopAll = async () => {
    try {
      await stopAllImplementAll();
      toast.success("All terminals stopped. Logs kept.");
    } catch {
      toast.error("Failed to stop");
    }
  };

  // Build a compact display list: only slots with runs + 1 empty "next available" slot
  const slotsWithRuns = new Map<number, (typeof terminalRuns)[0]>();
  for (const run of terminalRuns) {
    const s = run.slot;
    if (s == null || s < 1 || s > MAX_TERMINAL_SLOTS) continue;
    const existing = slotsWithRuns.get(s);
    const preferThis = !existing || (run.status === "running" && existing.status !== "running");
    if (preferThis) slotsWithRuns.set(s, run);
  }
  const occupiedSlotNums = [...slotsWithRuns.keys()].sort((a, b) => a - b);
  const nextFreeSlot = getNextFreeSlotOrNull(runningRuns) ?? (occupiedSlotNums.length + 1);
  type DisplayItem = { slotNum: number; run: (typeof implementAllRuns)[0] | null };
  const displayItems: DisplayItem[] = [
    ...occupiedSlotNums.map((s) => ({ slotNum: s, run: slotsWithRuns.get(s)! })),
    ...(occupiedSlotNums.length > 0 ? [{ slotNum: nextFreeSlot, run: null }] : []),
  ];
  const unslottedStartSlot =
    occupiedSlotNums.length > 0 ? Math.max(nextFreeSlot, occupiedSlotNums[occupiedSlotNums.length - 1] ?? 0) + 1 : 1;
  const unslottedDisplayItems: DisplayItem[] = unslottedRunningRuns.map((run, idx) => ({
    slotNum: unslottedStartSlot + idx,
    run,
  }));
  const allDisplayItems: DisplayItem[] = [...displayItems, ...unslottedDisplayItems];
  const hasAnyRuns = allDisplayItems.length > 0;

  const inProgressTickets = kanbanData?.columns?.in_progress?.items ?? [];

  const commandBar = (
    <div className={cn("flex items-center gap-1.5 flex-wrap", embedded ? "py-2" : "px-5 pb-4")}>
      {embedded && (
        <span className="text-[11px] font-medium text-muted-foreground mr-1.5">Terminals</span>
      )}
      <Button
        size="sm"
        onClick={handleStopAll}
        disabled={!anyRunning}
        className={cn(
          "gap-1.5 text-xs h-8 rounded-lg transition-all duration-200 text-white",
          anyRunning
            ? "bg-gradient-to-r from-rose-500/85 to-red-500/85 hover:from-rose-400 hover:to-red-400"
            : "bg-muted/50 text-muted-foreground"
        )}
      >
        <Square className="size-3" />
        Stop all
      </Button>
      <Button
        size="sm"
        onClick={clearImplementAllLogs}
        className="gap-1.5 text-xs h-8 rounded-lg text-white bg-gradient-to-r from-amber-500/85 to-orange-500/85 hover:from-amber-400 hover:to-orange-400 transition-all duration-200"
      >
        <Eraser className="size-3" />
        Clear
      </Button>
      <Button
        size="sm"
        onClick={archiveImplementAllLogs}
        className="gap-1.5 text-xs h-8 rounded-lg text-white bg-gradient-to-r from-cyan-500/85 to-blue-500/85 hover:from-cyan-400 hover:to-blue-400 transition-all duration-200"
      >
        <Archive className="size-3" />
        Archive
      </Button>
      {hasAnyRuns && (
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {allDisplayItems.length} terminal{allDisplayItems.length !== 1 ? "s" : ""}
          {anyRunning ? ` · ${runningRuns.filter((r) => r.status === "running").length} running` : " · all done"}
        </span>
      )}
    </div>
  );

  const terminalsContent = (
    <>
      {/* Section Header (standalone only) */}
      {!embedded && (
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="flex items-center justify-center size-7 rounded-lg bg-teal-500/10">
            <MonitorUp className="size-3.5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Terminal Output
            </h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Each column is one terminal — scroll horizontally to see all active agents.
            </p>
          </div>
        </div>
      )}

      {/* Command bar */}
      {!embedded ? <div className="px-5 pb-4">{commandBar}</div> : commandBar}

      {/* Terminals: horizontal scroll, equal-width cards */}
      <div className={cn("overflow-x-auto overflow-y-hidden scroll-smooth", embedded ? "pb-3" : "px-4 pb-4", !hasAnyRuns && "min-h-[140px]")}>
        {hasAnyRuns ? (
          <div className="flex gap-4 flex-nowrap w-max px-1 pb-1">
            {allDisplayItems.map(({ slotNum, run }) => {
              const slotIdx = slotNum - 1;
              const ticketNum = parseTicketNumberFromRunLabel(run?.label ?? undefined);
              const ticket = ticketNum != null
                ? inProgressTickets.find((t) => t.number === ticketNum) ?? null
                : null;
              return (
                <div
                  key={slotNum}
                  className="flex flex-col gap-3 flex-[0_0_420px] min-w-[420px] w-[420px]"
                >
                  <TerminalSlot run={run} slotIndex={slotIdx} heightClass="h-[380px]" />
                  {/* Ticket executing in this terminal — directly below */}
                  {(ticket || run?.label) && (
                    <div>
                      {ticket ? (
                        <KanbanTicketCard
                          ticket={ticket}
                          columnId="in_progress"
                          projectId={projectId}
                          onMarkDone={handleMarkDone}
                          onRedo={handleRedo}
                          onArchive={handleArchive}
                          onMoveToInProgress={async () => { }}
                        />
                      ) : run?.label ? (
                        <div className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-[11px] text-muted-foreground font-medium truncate" title={run.label}>
                            {run.label}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
            <div className="flex items-center justify-center size-10 rounded-xl bg-teal-500/10">
              <MonitorUp className="size-5 text-teal-400/60" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">No agents running yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 normal-case">
                Start one from Asking, Fast development, or other tabs above — terminals appear here automatically.
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Subtle horizontal scroll track hint */}
      {hasAnyRuns && (
        <div className={cn("h-0.5 bg-border/20 rounded-full mb-3", embedded ? "mx-3" : "mx-4")} />
      )}
    </>
  );

  if (embedded) return terminalsContent;

  return (
    <div className={cn("surface-card", WORKER_RUN_SECTION_SURFACE_CLASSNAME["terminal-output"])}>
      {terminalsContent}
    </div>
  );
}

/* WorkerTerminalSlot is now the shared TerminalSlot from @/components/shared/TerminalSlot */
