/**
 * Unit tests for cursor-paths: canonical .cursor entity paths and analyze job paths.
 */
import { describe, it, expect } from "vitest";
import {
  IDEAS_ROOT,
  PROJECT_ROOT,
  PLANNER_ROOT,
  WORKER_IMPLEMENT_ALL_PROMPT_PATH,
  WORKER_FIX_BUG_PROMPT_PATH,
  WORKER_NIGHT_SHIFT_PROMPT_PATH,
  AGENTS_ROOT,
  ANALYZE_JOB_IDS,
  PLANNER_TICKETS_PATH,
  PLANNER_FEATURES_PATH,
  PLANNER_KANBAN_STATE_PATH,
  IDEAS_DOC_PATH,
  IDEAS_PROMPT_PATH,
  PROJECT_DIR,
  PROJECT_PROMPT_PATH,
  PROJECT_OUTPUT_PATH,
  SETUP_DESIGN_DOC_PATH,
  SETUP_DESIGN_PROMPT_PATH,
  SETUP_ARCHITECTURE_DOC_PATH,
  SETUP_ARCHITECTURE_PROMPT_PATH,
  SETUP_TESTING_DOC_PATH,
  SETUP_TESTING_PROMPT_PATH,
  SETUP_TESTING_PROMPTS_DIR,
  SETUP_DOCUMENTATION_DOC_PATH,
  SETUP_DOCUMENTATION_PROMPT_PATH,
  SETUP_FRONTEND_JSON_PATH,
  SETUP_FRONTEND_PROMPT_PATH,
  SETUP_FRONTEND_ANALYSIS_PATH,
  SETUP_BACKEND_JSON_PATH,
  SETUP_BACKEND_PROMPT_PATH,
  SETUP_BACKEND_ANALYSIS_PATH,
  getPromptPath,
  getOutputPath,
  getSetupDocPath,
  getSetupPromptPath,
  type AnalyzeJobId,
} from "../cursor-paths";

describe("cursor-paths constants", () => {
  it("roots use .cursor prefix", () => {
    expect(IDEAS_ROOT).toBe(".cursor/0. ideas");
    expect(PROJECT_ROOT).toBe(".cursor/1. project");
    expect(PLANNER_ROOT).toBe(".cursor/7. planner");
  });

  it("worker and agents paths are under data", () => {
    expect(WORKER_IMPLEMENT_ALL_PROMPT_PATH).toContain("data/prompts");
    expect(WORKER_IMPLEMENT_ALL_PROMPT_PATH).toContain("implement-all.prompt.json");
    expect(WORKER_FIX_BUG_PROMPT_PATH).toContain("data/prompts");
    expect(WORKER_FIX_BUG_PROMPT_PATH).toContain("fix-bug.prompt.json");
    expect(WORKER_NIGHT_SHIFT_PROMPT_PATH).toContain("night-shift.prompt.json");
    expect(AGENTS_ROOT).toBe("data/agents");
  });

  it("planner paths are under 7. planner", () => {
    expect(PLANNER_FEATURES_PATH).toBe(".cursor/7. planner/features.md");
    expect(PLANNER_KANBAN_STATE_PATH).toBe(".cursor/7. planner/kanban-state.json");
  });

  it("project dir and output path match project root", () => {
    expect(PROJECT_DIR).toBe(PROJECT_ROOT);
    expect(PROJECT_OUTPUT_PATH).toBe(".cursor/1. project/PROJECT-INFO.md");
  });

  it("project prompt path is under worker root", () => {
    expect(PROJECT_PROMPT_PATH).toBe("data/prompts/workflows/project.prompt.json");
    expect(PROJECT_PROMPT_PATH.startsWith("data/prompts")).toBe(true);
  });

  it("ANALYZE_JOB_IDS has expected order and length", () => {
    expect(ANALYZE_JOB_IDS).toEqual([
      "ideas",
      "project",
      "design",
      "architecture",
      "testing",
      "documentation",
      "frontend",
      "backend",
    ]);
  });

  it("planner and ideas doc paths are defined", () => {
    expect(PLANNER_TICKETS_PATH).toBe(".cursor/7. planner/tickets.md");
    expect(IDEAS_DOC_PATH).toBe(".cursor/0. ideas/ideas.md");
    expect(IDEAS_PROMPT_PATH).toBe("data/prompts/workflows/ideas.prompt.json");
  });
});

describe("SETUP_* constants", () => {
  it("setup design, architecture, testing paths are under 1. project", () => {
    expect(SETUP_DESIGN_DOC_PATH).toBe(".cursor/1. project/design.md");
    expect(SETUP_DESIGN_PROMPT_PATH).toBe("data/prompts/workflows/design.prompt.json");
    expect(SETUP_ARCHITECTURE_DOC_PATH).toBe(".cursor/1. project/architecture.md");
    expect(SETUP_ARCHITECTURE_PROMPT_PATH).toBe("data/prompts/workflows/architecture.prompt.json");
    expect(SETUP_TESTING_DOC_PATH).toBe(".cursor/1. project/testing.md");
    expect(SETUP_TESTING_PROMPT_PATH).toBe("data/prompts/workflows/testing.prompt.json");
    expect(SETUP_TESTING_PROMPTS_DIR).toBe("data/prompts/workflows/testing");
  });

  it("setup documentation paths are under 1. project", () => {
    expect(SETUP_DOCUMENTATION_DOC_PATH).toBe(".cursor/1. project/documentation.md");
    expect(SETUP_DOCUMENTATION_PROMPT_PATH).toBe("data/prompts/workflows/documentation.prompt.json");
  });

  it("setup frontend and backend paths are under 1. project", () => {
    expect(SETUP_FRONTEND_JSON_PATH).toBe(".cursor/1. project/frontend.json");
    expect(SETUP_FRONTEND_PROMPT_PATH).toBe("data/prompts/workflows/frontend.prompt.json");
    expect(SETUP_FRONTEND_ANALYSIS_PATH).toBe(".cursor/1. project/frontend-analysis.md");
    expect(SETUP_BACKEND_JSON_PATH).toBe(".cursor/1. project/backend.json");
    expect(SETUP_BACKEND_PROMPT_PATH).toBe("data/prompts/workflows/backend.prompt.json");
    expect(SETUP_BACKEND_ANALYSIS_PATH).toBe(".cursor/1. project/backend-analysis.md");
  });

  it("all SETUP_* paths start with .cursor prefix", () => {
    const setupDocPaths = [
      SETUP_DESIGN_DOC_PATH,
      SETUP_ARCHITECTURE_DOC_PATH,
      SETUP_TESTING_DOC_PATH,
      SETUP_DOCUMENTATION_DOC_PATH,
      SETUP_FRONTEND_JSON_PATH,
      SETUP_FRONTEND_ANALYSIS_PATH,
      SETUP_BACKEND_JSON_PATH,
      SETUP_BACKEND_ANALYSIS_PATH,
    ];
    for (const p of setupDocPaths) {
      expect(p.startsWith(PROJECT_ROOT)).toBe(true);
    }
    const setupPromptPaths = [
      SETUP_DESIGN_PROMPT_PATH,
      SETUP_ARCHITECTURE_PROMPT_PATH,
      SETUP_TESTING_PROMPT_PATH,
      SETUP_TESTING_PROMPTS_DIR,
      SETUP_DOCUMENTATION_PROMPT_PATH,
      SETUP_FRONTEND_PROMPT_PATH,
      SETUP_BACKEND_PROMPT_PATH,
    ];
    for (const p of setupPromptPaths) {
      expect(p.startsWith("data/prompts")).toBe(true);
    }
  });
});

describe("getPromptPath", () => {
  it("returns ideas prompt path for ideas", () => {
    expect(getPromptPath("ideas")).toBe("data/prompts/workflows/ideas.prompt.json");
  });

  it("returns project prompt path for project", () => {
    expect(getPromptPath("project")).toBe("data/prompts/workflows/project.prompt.json");
  });

  it("returns path under data/prompts for design, architecture, testing, documentation", () => {
    expect(getPromptPath("design")).toBe("data/prompts/workflows/design.prompt.json");
    expect(getPromptPath("architecture")).toBe("data/prompts/workflows/architecture.prompt.json");
    expect(getPromptPath("testing")).toBe("data/prompts/workflows/testing.prompt.json");
    expect(getPromptPath("documentation")).toBe("data/prompts/workflows/documentation.prompt.json");
  });

  it("returns frontend and backend prompt paths", () => {
    expect(getPromptPath("frontend")).toBe("data/prompts/workflows/frontend.prompt.json");
    expect(getPromptPath("backend")).toBe("data/prompts/workflows/backend.prompt.json");
  });

  it("returns prompts path for unknown id (type-unsafe default)", () => {
    expect(getPromptPath("" as AnalyzeJobId)).toBe("data/prompts/workflows/.prompt.json");
  });
});

describe("getOutputPath", () => {
  it("returns ideas output for ideas", () => {
    expect(getOutputPath("ideas")).toBe(".cursor/0. ideas/ideas.md");
  });

  it("returns PROJECT-INFO.md for project", () => {
    expect(getOutputPath("project")).toBe(".cursor/1. project/PROJECT-INFO.md");
  });

  it("returns .md under 1. project for design, architecture, testing, documentation", () => {
    expect(getOutputPath("design")).toBe(".cursor/1. project/design.md");
    expect(getOutputPath("architecture")).toBe(".cursor/1. project/architecture.md");
    expect(getOutputPath("testing")).toBe(".cursor/1. project/testing.md");
    expect(getOutputPath("documentation")).toBe(".cursor/1. project/documentation.md");
  });

  it("returns frontend-analysis and backend-analysis for frontend/backend", () => {
    expect(getOutputPath("frontend")).toBe(".cursor/1. project/frontend-analysis.md");
    expect(getOutputPath("backend")).toBe(".cursor/1. project/backend-analysis.md");
  });

  it("returns empty string for unknown id (type-unsafe default)", () => {
    expect(getOutputPath("" as AnalyzeJobId)).toBe("");
  });
});

describe("getSetupDocPath", () => {
  it("returns ideas doc path for ideas", () => {
    expect(getSetupDocPath("ideas")).toBe(IDEAS_DOC_PATH);
  });

  it("returns path under 1. project for other keys", () => {
    expect(getSetupDocPath("design")).toBe(".cursor/1. project/design.md");
    expect(getSetupDocPath("architecture")).toBe(".cursor/1. project/architecture.md");
    expect(getSetupDocPath("testing")).toBe(".cursor/1. project/testing.md");
    expect(getSetupDocPath("documentation")).toBe(".cursor/1. project/documentation.md");
  });
});

describe("getSetupPromptPath", () => {
  it("returns ideas prompt path for ideas", () => {
    expect(getSetupPromptPath("ideas")).toBe(IDEAS_PROMPT_PATH);
  });

  it("returns .prompt.json under data/prompts for other keys", () => {
    expect(getSetupPromptPath("design")).toBe("data/prompts/workflows/design.prompt.json");
    expect(getSetupPromptPath("architecture")).toBe("data/prompts/workflows/architecture.prompt.json");
    expect(getSetupPromptPath("testing")).toBe("data/prompts/workflows/testing.prompt.json");
    expect(getSetupPromptPath("documentation")).toBe("data/prompts/workflows/documentation.prompt.json");
  });
});
