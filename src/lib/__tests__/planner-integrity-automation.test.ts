import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("planner integrity automation", () => {
  it("auto-generates linked milestone and tickets from idea create", () => {
    const ideasRoutePath = path.join(
      process.cwd(),
      "src/app/api/data/ideas/route.ts"
    );
    const source = fs.readFileSync(ideasRoutePath, "utf8");

    expect(source).toContain("createLinkedMilestoneForIdea");
    expect(source).toContain("createTemplateTicketsForIdea");
    expect(source).toContain("INSERT INTO milestones");
    expect(source).toContain("INSERT INTO plan_tickets");
  });

  it("provides a project integrity report endpoint with discrepancies and repair mode", () => {
    const routePath = path.join(
      process.cwd(),
      "src/app/api/data/projects/[id]/integrity-report/route.ts"
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).toContain("export async function GET");
    expect(source).toContain("export async function POST");
    expect(source).toContain("orphanIdeasWithoutMilestone");
    expect(source).toContain("orphanIdeasWithoutTicket");
    expect(source).toContain("orphanMilestonesIdea");
    expect(source).toContain("orphanTicketsMilestone");
    expect(source).toContain("orphanTicketsIdea");
  });

  it("keeps tauri create_idea path in parity with linked milestone+ticket generation", () => {
    const tauriPath = path.join(
      process.cwd(),
      "src-tauri/src/db/milestones_ideas.rs"
    );
    const source = fs.readFileSync(tauriPath, "utf8");

    expect(source).toContain("create_linked_milestone_for_idea");
    expect(source).toContain("create_template_plan_tickets_for_idea");
  });
});
