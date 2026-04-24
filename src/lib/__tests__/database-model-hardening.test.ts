import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("database model hardening", () => {
  it("adds integrity constraints, indexes, and join tables in db schema", () => {
    const dbPath = path.join(process.cwd(), "src/lib/db.ts");
    const source = fs.readFileSync(dbPath, "utf8");

    expect(source).toContain("CREATE TABLE IF NOT EXISTS project_prompt_links");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS project_ticket_links");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS project_idea_links");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS project_design_links");
    expect(source).toContain("CREATE TABLE IF NOT EXISTS project_architecture_links");
    expect(source).toContain("CHECK (status IN ('Todo', 'Done'))");
    expect(source).toContain("CHECK (priority IN ('P0', 'P1', 'P2', 'P3'))");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_status");
    expect(source).toContain("CREATE INDEX IF NOT EXISTS idx_implementation_log_project_completed");
  });

  it("exposes DB integrity audit helper queries", () => {
    const dbPath = path.join(process.cwd(), "src/lib/db.ts");
    const source = fs.readFileSync(dbPath, "utf8");

    expect(source).toContain("export function runDbIntegrityAudit");
    expect(source).toContain("orphanPlanTicketsProject");
    expect(source).toContain("invalidPlanTicketStatus");
    expect(source).toContain("orphanMilestonesIdea");
    expect(source).toContain("orphanIdeasWithoutMilestone");
    expect(source).toContain("orphanIdeasWithoutTicket");
  });

  it("does not mutate data in milestones and ideas GET routes", () => {
    const milestonesPath = path.join(
      process.cwd(),
      "src/app/api/data/projects/[id]/milestones/route.ts"
    );
    const ideasPath = path.join(process.cwd(), "src/app/api/data/ideas/route.ts");
    const milestonesSource = fs.readFileSync(milestonesPath, "utf8");
    const ideasSource = fs.readFileSync(ideasPath, "utf8");

    expect(milestonesSource).not.toContain("DELETE FROM milestones");
    expect(ideasSource).not.toContain("DELETE FROM ideas WHERE title = ?");
  });

  it("uses a single atomic completion endpoint from run-store hydration", () => {
    const hydrationPath = path.join(process.cwd(), "src/store/run-store-hydration.tsx");
    const completionRoutePath = path.join(
      process.cwd(),
      "src/app/api/data/projects/[id]/complete-run/route.ts"
    );
    const hydrationSource = fs.readFileSync(hydrationPath, "utf8");
    const completionRouteSource = fs.readFileSync(completionRoutePath, "utf8");

    expect(hydrationSource).toContain("/complete-run");
    expect(completionRouteSource).toContain("db.transaction");
    expect(completionRouteSource).toContain("UPDATE plan_tickets");
    expect(completionRouteSource).toContain("INSERT INTO implementation_log");
  });

  it("hardens planner relationship columns as non-null and constrained", () => {
    const dbPath = path.join(process.cwd(), "src/lib/db.ts");
    const source = fs.readFileSync(dbPath, "utf8");

    expect(source).toContain("milestone_id INTEGER NOT NULL");
    expect(source).toContain("idea_id INTEGER NOT NULL");
    expect(source).toContain("idea_id INTEGER NOT NULL REFERENCES ideas(id)");
    expect(source).toContain("FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE RESTRICT");
    expect(source).toContain("FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE RESTRICT");
  });

  it("adds strict planner constraints in tauri schema for parity", () => {
    const schemaPath = path.join(process.cwd(), "src-tauri/src/db/schema.rs");
    const source = fs.readFileSync(schemaPath, "utf8");

    expect(source).toContain("milestone_id INTEGER NOT NULL");
    expect(source).toContain("idea_id INTEGER NOT NULL");
    expect(source).toContain("idea_id INTEGER NOT NULL REFERENCES ideas(id)");
    expect(source).toContain("FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE RESTRICT");
  });
});
