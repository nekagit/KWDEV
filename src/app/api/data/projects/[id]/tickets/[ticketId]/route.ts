/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type PlanTicketRow } from "@/lib/db";
import { safeJsonArray } from "@/lib/db-json";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder", ticketId: "1" }];
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
    milestone_id: r.milestone_id,
    idea_id: r.idea_id,
    milestoneId: r.milestone_id,
    ideaId: r.idea_id,
    agents: safeJsonArray<string>(r.agents),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** GET: single ticket */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { id: projectId, ticketId } = await params;
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM plan_tickets WHERE id = ? AND project_id = ?"
      )
      .get(ticketId, projectId) as PlanTicketRow | undefined;
    if (!row) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(rowToTicket(row));
  } catch (e) {
    console.error("Ticket GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load ticket" },
      { status: 500 }
    );
  }
}

/** PATCH: update ticket. Body: partial { title, description, priority, feature_name, done, status, milestone_id, idea_id, agents } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { id: projectId, ticketId } = await params;
    const db = getDb();
    const existing = db
      .prepare(
        "SELECT * FROM plan_tickets WHERE id = ? AND project_id = ?"
      )
      .get(ticketId, projectId) as PlanTicketRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.title === "string") {
      updates.push("title = ?");
      values.push(body.title.trim());
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(typeof body.description === "string" ? body.description.trim() : null);
    }
    if (typeof body.priority === "string" && ["P0", "P1", "P2", "P3"].includes(body.priority)) {
      updates.push("priority = ?");
      values.push(body.priority);
    }
    if (typeof body.feature_name === "string") {
      updates.push("feature_name = ?");
      values.push(body.feature_name.trim());
    } else if (typeof body.featureName === "string") {
      updates.push("feature_name = ?");
      values.push(body.featureName.trim());
    }
    if (typeof body.done === "boolean") {
      updates.push("done = ?");
      values.push(body.done ? 1 : 0);
    }
    if (body.status === "Done" || body.status === "Todo") {
      updates.push("status = ?");
      values.push(body.status);
    }
    const nextMilestoneId =
      typeof body.milestone_id === "number"
        ? body.milestone_id
        : typeof body.milestoneId === "number"
          ? body.milestoneId
          : existing.milestone_id;
    const nextIdeaId =
      typeof body.idea_id === "number"
        ? body.idea_id
        : typeof body.ideaId === "number"
          ? body.ideaId
          : existing.idea_id;
    if (!Number.isInteger(nextMilestoneId) || nextMilestoneId < 1) {
      return NextResponse.json({ error: "milestone_id is required" }, { status: 400 });
    }
    if (!Number.isInteger(nextIdeaId) || nextIdeaId < 1) {
      return NextResponse.json({ error: "idea_id is required" }, { status: 400 });
    }
    const milestone = db
      .prepare("SELECT idea_id FROM milestones WHERE id = ? AND project_id = ?")
      .get(nextMilestoneId, projectId) as { idea_id: number } | undefined;
    if (!milestone) {
      return NextResponse.json({ error: "milestone_id does not exist for project" }, { status: 400 });
    }
    if (milestone.idea_id !== nextIdeaId) {
      return NextResponse.json({ error: "ticket idea_id must match milestone idea_id" }, { status: 400 });
    }
    if (typeof body.milestone_id === "number" || typeof body.milestoneId === "number") {
      updates.push("milestone_id = ?");
      values.push(nextMilestoneId);
    }
    if (typeof body.idea_id === "number" || typeof body.ideaId === "number") {
      updates.push("idea_id = ?");
      values.push(nextIdeaId);
    }
    if (Array.isArray(body.agents) && body.agents.every((agent: unknown) => typeof agent === "string")) {
      updates.push("agents = ?");
      values.push(JSON.stringify(body.agents));
    }

    if (updates.length === 0) {
      return NextResponse.json(rowToTicket(existing));
    }
    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now);
    values.push(ticketId, projectId);

    db.prepare(
      `UPDATE plan_tickets SET ${updates.join(", ")} WHERE id = ? AND project_id = ?`
    ).run(...values);

    const row = db
      .prepare("SELECT * FROM plan_tickets WHERE id = ? AND project_id = ?")
      .get(ticketId, projectId) as PlanTicketRow;
    return NextResponse.json(rowToTicket(row));
  } catch (e) {
    console.error("Ticket PATCH error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update ticket" },
      { status: 500 }
    );
  }
}

/** DELETE: remove ticket */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { id: projectId, ticketId } = await params;
    const db = getDb();
    const r = db
      .prepare("DELETE FROM plan_tickets WHERE id = ? AND project_id = ?")
      .run(ticketId, projectId);
    if (r.changes === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Ticket DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
