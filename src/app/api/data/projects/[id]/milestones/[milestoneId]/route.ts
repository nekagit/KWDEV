/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type MilestoneRow } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder", milestoneId: "1" }];
}

function rowToMilestone(r: MilestoneRow) {
  return {
    id: r.id,
    project_id: r.project_id,
    idea_id: r.idea_id,
    name: r.name,
    slug: r.slug,
    content: r.content ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** GET: single milestone */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params;
    const mid = Number(milestoneId);
    if (!Number.isInteger(mid)) {
      return NextResponse.json({ error: "Invalid milestone id" }, { status: 400 });
    }
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM milestones WHERE id = ? AND project_id = ?"
      )
      .get(mid, projectId) as MilestoneRow | undefined;
    if (!row) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    return NextResponse.json(rowToMilestone(row));
  } catch (e) {
    console.error("Milestone GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load milestone" },
      { status: 500 }
    );
  }
}

/** PATCH: update milestone. Body: partial { name, slug, content, idea_id } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params;
    const mid = Number(milestoneId);
    if (!Number.isInteger(mid)) {
      return NextResponse.json({ error: "Invalid milestone id" }, { status: 400 });
    }
    const db = getDb();
    const existing = db
      .prepare(
        "SELECT * FROM milestones WHERE id = ? AND project_id = ?"
      )
      .get(mid, projectId) as MilestoneRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.name === "string") {
      updates.push("name = ?");
      values.push(body.name.trim());
    }
    if (typeof body.slug === "string") {
      updates.push("slug = ?");
      values.push(body.slug.trim());
    }
    if (body.content !== undefined) {
      updates.push("content = ?");
      values.push(typeof body.content === "string" ? body.content.trim() : null);
    }
    let nextIdeaId: number | null = null;
    if (typeof body.idea_id === "number") {
      nextIdeaId = body.idea_id;
      updates.push("idea_id = ?");
      values.push(body.idea_id);
    } else if (typeof body.ideaId === "number") {
      nextIdeaId = body.ideaId;
      updates.push("idea_id = ?");
      values.push(body.ideaId);
    }

    if (updates.length === 0) {
      return NextResponse.json(rowToMilestone(existing));
    }
    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now);
    values.push(mid, projectId);

    db.transaction(() => {
      if (nextIdeaId != null) {
        const linkedIdea = db
          .prepare("SELECT id FROM ideas WHERE id = ? AND project_id = ?")
          .get(nextIdeaId, projectId) as { id: number } | undefined;
        if (!linkedIdea) {
          throw new Error("idea_id does not exist for project");
        }
      }
      db.prepare(
        `UPDATE milestones SET ${updates.join(", ")} WHERE id = ? AND project_id = ?`
      ).run(...values);
      if (nextIdeaId != null) {
        db.prepare("UPDATE plan_tickets SET idea_id = ?, updated_at = ? WHERE project_id = ? AND milestone_id = ?")
          .run(nextIdeaId, now, projectId, mid);
      }
    })();

    const row = db
      .prepare("SELECT * FROM milestones WHERE id = ? AND project_id = ?")
      .get(mid, projectId) as MilestoneRow;
    return NextResponse.json(rowToMilestone(row));
  } catch (e) {
    console.error("Milestone PATCH error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update milestone" },
      { status: 500 }
    );
  }
}

/** DELETE: remove milestone */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: projectId, milestoneId } = await params;
    const mid = Number(milestoneId);
    if (!Number.isInteger(mid)) {
      return NextResponse.json({ error: "Invalid milestone id" }, { status: 400 });
    }
    const db = getDb();
    const linkedTicket = db
      .prepare("SELECT id FROM plan_tickets WHERE project_id = ? AND milestone_id = ? LIMIT 1")
      .get(projectId, mid) as { id: string } | undefined;
    if (linkedTicket) {
      return NextResponse.json(
        { error: "Cannot delete milestone with linked tickets" },
        { status: 409 }
      );
    }
    const r = db
      .prepare("DELETE FROM milestones WHERE id = ? AND project_id = ?")
      .run(mid, projectId);
    if (r.changes === 0) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Milestone DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
