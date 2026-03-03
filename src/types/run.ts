/**
 * Run types: timing defaults, run state, terminal history, night-shift phases, and RunMeta.
 */

/** Maximum number of terminal slots (1..MAX). Backend and script support up to 20. */
export const MAX_TERMINAL_SLOTS = 20;

export const DEFAULT_TIMING = {
  sleep_after_open_project: 4,
  sleep_after_window_focus: 1.5,
  sleep_between_shift_tabs: 0.5,
  sleep_after_all_shift_tabs: 0.8,
  sleep_after_cmd_n: 2,
  sleep_before_paste: 0.8,
  sleep_after_paste: 1,
  sleep_after_enter: 2,
  sleep_between_projects: 3,
  sleep_between_rounds: 270,
};

export type Timing = typeof DEFAULT_TIMING;

export interface PromptRecordItem {
  id: number;
  title: string;
  content: string;
}

/** Night shift Circle phases (order: create → implement → test → debugging → refactor). */
export type NightShiftCirclePhase = "refactor" | "test" | "debugging" | "implement" | "create";

/** Metadata for post-run actions (write file, parse and notify). Used by temp tickets. */
export interface RunMeta {
  projectId?: string;
  outputPath?: string;
  /** How to handle stdout when run exits: write_file | parse_ideas | parse_ticket | parse_architectures | parse_prompt | parse_project_from_idea | improve_idea */
  onComplete?: string;
  /** Extra payload for onComplete handlers (e.g. repoPath for writeProjectFile). */
  payload?: Record<string, unknown>;
  /** For ticket Implement All runs: repo path for git diff. */
  repoPath?: string;
  /** Ticket id (UUID) for marking ticket done when run completes. */
  ticketId?: string;
  /** Ticket number (for implementation_log). */
  ticketNumber?: number;
  /** Ticket title (for implementation_log). */
  ticketTitle?: string;
  /** Milestone id (for implementation_log). */
  milestoneId?: number;
  /** Idea id (for implementation_log). */
  ideaId?: number;
  /** Git ref (e.g. HEAD) at run start for diff when run exits. */
  gitRefAtStart?: string;
  /** Night shift run: replenish with same prompt when this run exits (if night shift still active). */
  isNightShift?: boolean;
  /** Night shift Circle run: this run is part of a Circle phase batch. */
  isNightShiftCircle?: boolean;
  /** Which Circle phase this run belongs to (refactor, test, debugging, implement, create). */
  circlePhase?: NightShiftCirclePhase;
  /** Night shift Idea-driven run: one run per ticket+phase in normal agent mode. */
  isNightShiftIdeaDriven?: boolean;
  /** Ticket id for idea-driven run (matches current ticket). */
  ideaDrivenTicketId?: string;
  /** Phase for idea-driven run (create | implement | test | debugging | refactor). */
  ideaDrivenPhase?: NightShiftCirclePhase;
  /** When set, this job reuses an existing placeholder run (e.g. Ask) so the run appears in the terminal section immediately. */
  placeholderRunId?: string;
  /** Cursor CLI agent mode: agent (default) | ask | plan | debug. Passed to run_run_terminal_agent and script -M. */
  agentMode?: "agent" | "ask" | "plan" | "debug";
  /** Agent provider: "cursor" (default), "claude", or "gemini". Selects which CLI script to run. */
  provider?: "cursor" | "claude" | "gemini";
}

export interface Run {
  runId: string;
  label: string;
  logLines: string[];
  status: "running" | "done";
  /** Terminal slot 1..MAX_TERMINAL_SLOTS for Implement All; used to place run in correct column (slot 1 = first terminal). */
  slot?: number;
  /** When the run was started (ms since epoch). Used for elapsed timer. */
  startedAt?: number;
  /** When the run finished (ms since epoch). Set on script-exited for duration. */
  doneAt?: number;
  /** Script exit code when run has finished (0 = success, non-zero = failure). Set from script-exited payload. */
  exitCode?: number;
  /** Optional metadata for post-run actions (temp tickets). */
  meta?: RunMeta;
  /** First localhost URL detected from script output (e.g. http://localhost:3000) for "Open app" link. */
  localUrl?: string;
}

/** Alias for Run used by run store and UI. */
export type RunInfo = Run;

/** One completed terminal run stored for History section. */
export interface TerminalOutputHistoryEntry {
  id: string;
  runId: string;
  label: string;
  output: string;
  timestamp: string;
  exitCode?: number;
  slot?: number;
  /** Elapsed time in milliseconds (run doneAt - startedAt). Optional for backwards compatibility. */
  durationMs?: number;
}

export interface FileEntry {
  name: string;
  path: string;
}


