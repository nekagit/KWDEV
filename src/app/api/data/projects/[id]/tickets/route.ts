/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type PlanTicketRow } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

function rowToTicket(r: PlanTicketRow) {
  return {
    id: r.id,
    project_id: r.project_id,
    number: r.number,
    title: r.title,
    description: r.description ?? undefined,
    priority: r.priority as "P0" | "P1" | "P2" | "P3",
    feature_name: r.feature_name,
    featureName: r.feature_name,
    done: r.done === 1,
    status: r.status as "Todo" | "Done",
    milestone_id: r.milestone_id ?? undefined,
    idea_id: r.idea_id ?? undefined,
    milestoneId: r.milestone_id ?? undefined,
    ideaId: r.idea_id ?? undefined,
    agents: r.agents ? (JSON.parse(r.agents) as string[]) : undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** GET: list tickets for project */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM plan_tickets WHERE project_id = ? ORDER BY number ASC"
      )
      .all(projectId) as PlanTicketRow[];
    return NextResponse.json(rows.map(rowToTicket));
  } catch (e) {
    console.error("Tickets GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load tickets" },
      { status: 500 }
    );
  }
}

/** POST: create ticket. Body: number?, title, description?, priority?, feature_name?, milestone_id, idea_id?, agents? */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }
    const milestoneId =
      typeof body.milestone_id === "number"
        ? body.milestone_id
        : typeof body.milestoneId === "number"
          ? body.milestoneId
          : null;
    const ideaId =
      typeof body.idea_id === "number"
        ? body.idea_id
        : typeof body.ideaId === "number"
          ? body.ideaId
          : null;
    if (milestoneId == null) {
      return NextResponse.json(
        { error: "milestone_id is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const priority =
      typeof body.priority === "string" &&
      ["P0", "P1", "P2", "P3"].includes(body.priority)
        ? body.priority
        : "P1";
    const featureName =
      typeof body.feature_name === "string"
        ? body.feature_name.trim()
        : body.featureName && typeof body.featureName === "string"
          ? body.featureName.trim()
          : "General";
    const description =
      typeof body.description === "string" ? body.description.trim() : null;
    const done = body.done === true ? 1 : 0;
    const status =
      body.status === "Done" ? "Done" : "Todo";
    const agents = Array.isArray(body.agents)
      ? JSON.stringify(body.agents)
      : null;

    let number = typeof body.number === "number" ? body.number : undefined;
    if (number == null) {
      const max = db
        .prepare(
          "SELECT COALESCE(MAX(number), 0) AS n FROM plan_tickets WHERE project_id = ?"
        )
        .get(projectId) as { n: number };
      number = max.n + 1;
    }
    const id = `ticket-${projectId}-${number}`;

    db.prepare(
      `INSERT INTO plan_tickets (id, project_id, number, title, description, priority, feature_name, done, status, milestone_id, idea_id, agents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      projectId,
      number,
      title,
      description,
      priority,
      featureName,
      done,
      status,
      milestoneId,
      ideaId,
      agents,
      now,
      now
    );
    const row = db
      .prepare("SELECT * FROM plan_tickets WHERE id = ?")
      .get(id) as PlanTicketRow;
    return NextResponse.json(rowToTicket(row));
  } catch (e) {
    console.error("Tickets POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}
