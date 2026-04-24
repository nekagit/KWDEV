import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

type IntegrityReport = {
  projectId: string;
  counts: {
    ideas: number;
    milestones: number;
    tickets: number;
  };
  discrepancies: {
    orphanIdeasWithoutMilestone: number;
    orphanIdeasWithoutTicket: number;
    orphanMilestonesIdea: number;
    orphanTicketsMilestone: number;
    orphanTicketsIdea: number;
    ticketIdeaMismatch: number;
  };
};

function createReport(projectId: string): IntegrityReport {
  const db = getDb();
  const count = (sql: string, ...values: unknown[]) =>
    (db.prepare(sql).get(...values) as { c: number }).c;

  return {
    projectId,
    counts: {
      ideas: count("SELECT COUNT(*) AS c FROM ideas WHERE project_id = ?", projectId),
      milestones: count("SELECT COUNT(*) AS c FROM milestones WHERE project_id = ?", projectId),
      tickets: count("SELECT COUNT(*) AS c FROM plan_tickets WHERE project_id = ?", projectId),
    },
    discrepancies: {
      orphanIdeasWithoutMilestone: count(
        "SELECT COUNT(*) AS c FROM ideas i LEFT JOIN milestones m ON m.idea_id = i.id AND m.project_id = i.project_id WHERE i.project_id = ? AND m.id IS NULL",
        projectId
      ),
      orphanIdeasWithoutTicket: count(
        "SELECT COUNT(*) AS c FROM ideas i LEFT JOIN plan_tickets t ON t.idea_id = i.id AND t.project_id = i.project_id WHERE i.project_id = ? AND t.id IS NULL",
        projectId
      ),
      orphanMilestonesIdea: count(
        "SELECT COUNT(*) AS c FROM milestones m LEFT JOIN ideas i ON i.id = m.idea_id WHERE m.project_id = ? AND i.id IS NULL",
        projectId
      ),
      orphanTicketsMilestone: count(
        "SELECT COUNT(*) AS c FROM plan_tickets t LEFT JOIN milestones m ON m.id = t.milestone_id WHERE t.project_id = ? AND m.id IS NULL",
        projectId
      ),
      orphanTicketsIdea: count(
        "SELECT COUNT(*) AS c FROM plan_tickets t LEFT JOIN ideas i ON i.id = t.idea_id WHERE t.project_id = ? AND i.id IS NULL",
        projectId
      ),
      ticketIdeaMismatch: count(
        "SELECT COUNT(*) AS c FROM plan_tickets t JOIN milestones m ON m.id = t.milestone_id WHERE t.project_id = ? AND t.idea_id != m.idea_id",
        projectId
      ),
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    return NextResponse.json(createReport(projectId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate integrity report" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    db.transaction(() => {
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE plan_tickets
         SET idea_id = (
           SELECT m.idea_id FROM milestones m WHERE m.id = plan_tickets.milestone_id
         ),
         updated_at = ?
         WHERE project_id = ?
           AND EXISTS (
             SELECT 1 FROM milestones m WHERE m.id = plan_tickets.milestone_id AND m.idea_id != plan_tickets.idea_id
           )`
      ).run(now, projectId);
    })();
    return NextResponse.json(createReport(projectId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to repair integrity issues" },
      { status: 500 }
    );
  }
}
