/**
 * Unit tests for src/lib/analysis-prompt.ts — prompt builders for analysis, Kanban context, and ticket blocks.
 */
import { describe, it, expect } from "vitest";
import {
  ANALYSIS_PROMPT,
  ANALYSIS_PROMPT_FILENAME,
  buildDesignAnalysisPromptRecord,
  buildArchitectureAnalysisPromptRecord,
  buildKanbanContextBlock,
  combinePromptRecordWithKanban,
  buildTicketPromptBlock,
  combineTicketPromptWithUserPrompt,
} from "../analysis-prompt";

describe("ANALYSIS_PROMPT and ANALYSIS_PROMPT_FILENAME", () => {
  it("ANALYSIS_PROMPT_FILENAME is analysis-prompt.md", () => {
    expect(ANALYSIS_PROMPT_FILENAME).toBe("analysis-prompt.md");
  });

  it("ANALYSIS_PROMPT mentions .cursor and ANALYSIS.md", () => {
    expect(ANALYSIS_PROMPT).toContain(".cursor");
    expect(ANALYSIS_PROMPT).toContain("ANALYSIS.md");
  });
});

describe("buildDesignAnalysisPromptRecord", () => {
  it("includes project name and .cursor/design.md", () => {
    const out = buildDesignAnalysisPromptRecord({
      projectName: "MyApp",
      designNames: [],
    });
    expect(out).toContain("MyApp");
    expect(out).toContain(".cursor/design.md");
  });

  it("includes linked design names when provided", () => {
    const out = buildDesignAnalysisPromptRecord({
      projectName: "MyApp",
      designNames: ["Dashboard", "Landing"],
    });
    expect(out).toContain("Dashboard");
    expect(out).toContain("Landing");
  });

  it("omits linked design sentence when designNames is empty", () => {
    const out = buildDesignAnalysisPromptRecord({
      projectName: "P",
      designNames: [],
    });
    expect(out).not.toMatch(/Linked design names:/);
  });
});

describe("buildArchitectureAnalysisPromptRecord", () => {
  it("includes project name and .cursor/architecture.md", () => {
    const out = buildArchitectureAnalysisPromptRecord({
      projectName: "MyApp",
      architectureNames: [],
    });
    expect(out).toContain("MyApp");
    expect(out).toContain(".cursor/architecture.md");
  });

  it("includes linked architecture names when provided", () => {
    const out = buildArchitectureAnalysisPromptRecord({
      projectName: "MyApp",
      architectureNames: ["Hexagonal", "Clean"],
    });
    expect(out).toContain("Hexagonal");
    expect(out).toContain("Clean");
  });

  it("omits linked architecture sentence when architectureNames is empty", () => {
    const out = buildArchitectureAnalysisPromptRecord({
      projectName: "P",
      architectureNames: [],
    });
    expect(out).not.toMatch(/Linked architecture names:/);
  });
});

describe("buildKanbanContextBlock", () => {
  it("returns header and no-tickets message when tickets is empty", () => {
    const out = buildKanbanContextBlock({ tickets: [] });
    expect(out).toContain("Current scope (from Kanban");
    expect(out).toContain("No tickets parsed yet");
  });

  it("includes tickets grouped by priority P0, P1, P2, P3", () => {
    const out = buildKanbanContextBlock({
      tickets: [
        { number: 1, title: "T1", priority: "P1", featureName: "F1", done: false },
        { number: 2, title: "T2", priority: "P0", featureName: "F0", done: true },
      ],
    });
    expect(out).toContain("#### P0");
    expect(out).toContain("#### P1");
    expect(out).toContain("#2");
    expect(out).toContain("T2");
    expect(out).toContain("[x]");
    expect(out).toContain("#1");
    expect(out).toContain("T1");
    expect(out).toContain("[ ]");
  });

  it("includes feature name in ticket line when present", () => {
    const out = buildKanbanContextBlock({
      tickets: [
        { number: 1, title: "Fix bug", priority: "P0", featureName: "Auth", done: false },
      ],
    });
    expect(out).toContain("(Auth)");
  });

  it("skips priority sections that have no tickets", () => {
    const out = buildKanbanContextBlock({
      tickets: [
        { number: 1, title: "Only P2", priority: "P2", featureName: "", done: false },
      ],
    });
    expect(out).toContain("#### P2");
    expect(out).not.toContain("#### P0");
    expect(out).not.toContain("#### P1");
    expect(out).not.toContain("#### P3");
  });
});

describe("combinePromptRecordWithKanban", () => {
  it("returns only kanban context when user prompt is empty", () => {
    const kanban = "## Kanban\n\nContext.";
    expect(combinePromptRecordWithKanban(kanban, "")).toBe(kanban);
    expect(combinePromptRecordWithKanban(kanban, "   ")).toBe(kanban);
  });

  it("combines kanban and user prompt with separator when user prompt has content", () => {
    const kanban = "## Kanban";
    const user = "User prompt text";
    const out = combinePromptRecordWithKanban(kanban, user);
    expect(out).toContain(kanban);
    expect(out).toContain("---");
    expect(out).toContain(user);
    expect(out).toBe(`${kanban}\n\n---\n\n${user}`);
  });

  it("trims user prompt before combining", () => {
    const out = combinePromptRecordWithKanban("K", "  user  ");
    expect(out).toContain("user");
    expect(out).not.toContain("  user  ");
  });
});

describe("buildTicketPromptBlock", () => {
  it("includes ticket number, title, priority, and feature", () => {
    const out = buildTicketPromptBlock(
      {
        number: 42,
        title: "Add login",
        priority: "P1",
        featureName: "Auth",
      },
      null
    );
    expect(out).toContain("#42");
    expect(out).toContain("Add login");
    expect(out).toContain("P1");
    expect(out).toContain("Auth");
    expect(out).toContain("## Ticket");
  });

  it("uses — for empty feature name", () => {
    const out = buildTicketPromptBlock(
      { number: 1, title: "T", priority: "P0", featureName: "" },
      null
    );
    expect(out).toContain("—");
  });

  it("includes description section when description is non-empty", () => {
    const out = buildTicketPromptBlock(
      {
        number: 1,
        title: "T",
        description: "Do the thing.",
        priority: "P0",
        featureName: "F",
      },
      null
    );
    expect(out).toContain("### Description");
    expect(out).toContain("Do the thing.");
  });

  it("omits description section when description is empty or whitespace", () => {
    const out = buildTicketPromptBlock(
      { number: 1, title: "T", description: "  ", priority: "P0", featureName: "F" },
      null
    );
    expect(out).not.toContain("### Description");
  });

  it("includes agents line when agents array is non-empty", () => {
    const out = buildTicketPromptBlock(
      {
        number: 1,
        title: "T",
        priority: "P0",
        featureName: "F",
        agents: ["frontend-dev", "backend-dev"],
      },
      null
    );
    expect(out).toContain("Agents:");
    expect(out).toContain("@frontend-dev");
    expect(out).toContain("@backend-dev");
  });

  it("includes agent instructions section when agentMdContent is non-empty", () => {
    const out = buildTicketPromptBlock(
      { number: 1, title: "T", priority: "P0", featureName: "F" },
      "## Agent instructions\n\nDo this."
    );
    expect(out).toContain("## Agent instructions");
    expect(out).toContain("Do this.");
  });

  it("omits agent instructions when agentMdContent is null or empty", () => {
    const out = buildTicketPromptBlock(
      { number: 1, title: "T", priority: "P0", featureName: "F" },
      null
    );
    expect(out).not.toContain("## Agent instructions");
  });
});

describe("combineTicketPromptWithUserPrompt", () => {
  it("returns only ticket block when user prompt is empty", () => {
    const block = "## Ticket\n\n#1 — T";
    expect(combineTicketPromptWithUserPrompt(block, "")).toBe(block);
    expect(combineTicketPromptWithUserPrompt(block, "   ")).toBe(block);
  });

  it("combines ticket block and user prompt with separator when user prompt has content", () => {
    const block = "## Ticket";
    const user = "Run implement all.";
    const out = combineTicketPromptWithUserPrompt(block, user);
    expect(out).toContain(block);
    expect(out).toContain("---");
    expect(out).toContain(user);
    expect(out).toBe(`${block}\n\n---\n\n${user}`);
  });
});
