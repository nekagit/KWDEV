/**
 * Canonical paths for prompts and agents.
 * Prompts live in data/prompts; agents in data/agents.
 * Documents (ideas, design, architecture, etc.) are stored in the database.
 */

const CURSOR = ".cursor";
const DATA = "data";

// ─── New Structure (data folder) ───────────────────────────────────────────
/** Prompts folder (*.prompt.md editable sources, *.prompt.json runtime). */
export const WORKER_ROOT = `${DATA}/prompts`;
/** Prompt workflow files (*.prompt.md, *.prompt.json). */
export const WORKER_PROMPTS_WORKFLOWS_ROOT = `${WORKER_ROOT}/workflows`;
/** Prompt output files (*-output.md). */
export const WORKER_PROMPTS_OUTPUTS_ROOT = `${WORKER_ROOT}/outputs`;
/** Agent definitions folder (*.md files). */
export const AGENTS_ROOT = `${DATA}/agents`;
/** Project's .cursor agents folder (after Initialize from workspace data/agents). */
export const CURSOR_AGENTS_ROOT = `${CURSOR}/agents`;

// ─── Legacy paths (deprecated, kept for migration compatibility) ───────────
/** @deprecated Use database instead. Will be removed after migration. */
export const IDEAS_ROOT = `${CURSOR}/0. ideas`;
/** @deprecated Use database instead. Will be removed after migration. */
export const PROJECT_ROOT = `${CURSOR}/1. project`;
/** @deprecated Use database instead. Will be removed after migration. */
export const PLANNER_ROOT = `${CURSOR}/7. planner`;
/** @deprecated Legacy worker path; same as WORKER_ROOT. Kept for migration API compatibility. */
export const LEGACY_WORKER_ROOT = `${DATA}/prompts`;
/** @deprecated Old agents folder path. Use AGENTS_ROOT instead. */
export const LEGACY_AGENTS_ROOT = `${CURSOR}/2. agents`;

// ─── Worker Prompts ────────────────────────────────────────────────────────
/** Runtime prompt reads are JSON-primary. */
export const WORKER_IMPLEMENT_ALL_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/implement-all.prompt.json`;
export const WORKER_FIX_BUG_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/fix-bug.prompt.json`;
/** Night shift: 3 agents run this prompt in a loop; edit this file to change the prompt. */
export const WORKER_NIGHT_SHIFT_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/night-shift.prompt.json`;
/** Night shift Circle / badges: per-phase prompts (refactor, test, debugging, implement, create). */
export const WORKER_NIGHT_SHIFT_PHASE_PROMPT_PATHS = {
  refactor: `${WORKER_PROMPTS_WORKFLOWS_ROOT}/refactor.prompt.json`,
  test: `${WORKER_PROMPTS_WORKFLOWS_ROOT}/test.prompt.json`,
  debugging: `${WORKER_PROMPTS_WORKFLOWS_ROOT}/debugging.prompt.json`,
  implement: `${WORKER_PROMPTS_WORKFLOWS_ROOT}/implement.prompt.json`,
  create: `${WORKER_PROMPTS_WORKFLOWS_ROOT}/create.prompt.json`,
} as const;
/** Auto idea-driven: prompts and output paths for the automated flow. */
export const WORKER_ANALYZE_PROJECT_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/analyze-project.prompt.json`;
export const WORKER_IDEA_TO_MILESTONES_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/idea-to-milestones.prompt.json`;
export const WORKER_MILESTONE_TO_TICKETS_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/milestone-to-tickets.prompt.json`;
export const WORKER_IDEA_ANALYSIS_OUTPUT_PATH = `${WORKER_PROMPTS_OUTPUTS_ROOT}/idea-analysis-output.md`;
export const WORKER_MILESTONES_OUTPUT_PATH = `${WORKER_PROMPTS_OUTPUTS_ROOT}/milestones-output.md`;
export const WORKER_TICKETS_OUTPUT_PATH = `${WORKER_PROMPTS_OUTPUTS_ROOT}/tickets-output.md`;

/** Analyze queue file (worker tab: prompts as tickets). Stored under data/queue. */
export const ANALYZE_QUEUE_PATH = "data/queue/analyze-jobs.json";

// ─── Analyze Jobs (prompts stored in data/prompts, outputs go to database) ──────
/** Analyze job ids. */
export type AnalyzeJobId =
  | "ideas"
  | "project"
  | "design"
  | "architecture"
  | "testing"
  | "documentation"
  | "frontend"
  | "backend";

/** Prompt path for an analyze job. All prompts are now in the worker folder. */
export function getPromptPath(id: AnalyzeJobId): string {
  return `${WORKER_PROMPTS_WORKFLOWS_ROOT}/${id}.prompt.json`;
}

/** Output path for an analyze job (legacy file paths, use database instead). */
export function getOutputPath(id: AnalyzeJobId): string {
  switch (id) {
    case "ideas":
      return `${IDEAS_ROOT}/ideas.md`;
    case "project":
      return `${PROJECT_ROOT}/PROJECT-INFO.md`;
    case "design":
    case "architecture":
    case "testing":
    case "documentation":
      return `${PROJECT_ROOT}/${id}.md`;
    case "frontend":
      return `${PROJECT_ROOT}/frontend-analysis.md`;
    case "backend":
      return `${PROJECT_ROOT}/backend-analysis.md`;
    default:
      return "";
  }
}

/** All analyze job ids in default order. */
export const ANALYZE_JOB_IDS: AnalyzeJobId[] = [
  "ideas",
  "project",
  "design",
  "architecture",
  "testing",
  "documentation",
  "frontend",
  "backend",
];

// ─── Legacy Paths (deprecated, kept for migration) ─────────────────────────
/** @deprecated Use database (project_docs table, doc_type='ideas'). */
export const IDEAS_DOC_PATH = `${IDEAS_ROOT}/ideas.md`;
/** @deprecated Prompts now in worker folder. */
export const IDEAS_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/ideas.prompt.json`;

/** @deprecated Use database instead. */
export const PROJECT_DIR = PROJECT_ROOT;
/** @deprecated Prompts now in worker folder. */
export const PROJECT_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/project.prompt.json`;
/** @deprecated Use database (project_docs table, doc_type='project_info'). */
export const PROJECT_OUTPUT_PATH = `${PROJECT_ROOT}/PROJECT-INFO.md`;

/** @deprecated Use database (project_docs table, doc_type='design'). */
export const SETUP_DESIGN_DOC_PATH = `${PROJECT_ROOT}/design.md`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_DESIGN_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/design.prompt.json`;
/** @deprecated Use database (project_docs table, doc_type='architecture'). */
export const SETUP_ARCHITECTURE_DOC_PATH = `${PROJECT_ROOT}/architecture.md`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_ARCHITECTURE_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/architecture.prompt.json`;
/** @deprecated Use database (project_docs table, doc_type='testing'). */
export const SETUP_TESTING_DOC_PATH = `${PROJECT_ROOT}/testing.md`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_TESTING_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/testing.prompt.json`;
/** @deprecated Use database instead. */
export const SETUP_TESTING_PROMPTS_DIR = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/testing`;
/** @deprecated Use database (project_docs table, doc_type='documentation'). */
export const SETUP_DOCUMENTATION_DOC_PATH = `${PROJECT_ROOT}/documentation.md`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_DOCUMENTATION_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/documentation.prompt.json`;
/** @deprecated Use database (project_configs table, config_type='frontend'). */
export const SETUP_FRONTEND_JSON_PATH = `${PROJECT_ROOT}/frontend.json`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_FRONTEND_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/frontend.prompt.json`;
/** @deprecated Use database (project_configs table, config_type='frontend', analysis_content). */
export const SETUP_FRONTEND_ANALYSIS_PATH = `${PROJECT_ROOT}/frontend-analysis.md`;
/** @deprecated Use database (project_configs table, config_type='backend'). */
export const SETUP_BACKEND_JSON_PATH = `${PROJECT_ROOT}/backend.json`;
/** @deprecated Prompts now in worker folder. */
export const SETUP_BACKEND_PROMPT_PATH = `${WORKER_PROMPTS_WORKFLOWS_ROOT}/backend.prompt.json`;
/** @deprecated Use database (project_configs table, config_type='backend', analysis_content). */
export const SETUP_BACKEND_ANALYSIS_PATH = `${PROJECT_ROOT}/backend-analysis.md`;

/** @deprecated Use database (project_docs table, doc_type). */
export const PLANNER_TICKETS_PATH = `${PLANNER_ROOT}/tickets.md`;
/** @deprecated Use database instead. */
export const PLANNER_FEATURES_PATH = `${PLANNER_ROOT}/features.md`;
/** @deprecated Use database (plan_kanban_state table). */
export const PLANNER_KANBAN_STATE_PATH = `${PLANNER_ROOT}/kanban-state.json`;

/** @deprecated Doc path for a setup key. Use database (project_docs table) instead. */
export function getSetupDocPath(key: "design" | "ideas" | "architecture" | "testing" | "documentation"): string {
  if (key === "ideas") return IDEAS_DOC_PATH;
  return `${PROJECT_ROOT}/${key}.md`;
}

/** @deprecated Prompt path for a setup key. Prompts now in worker folder. */
export function getSetupPromptPath(key: "design" | "ideas" | "architecture" | "testing" | "documentation"): string {
  return `${WORKER_PROMPTS_WORKFLOWS_ROOT}/${key}.prompt.json`;
}
