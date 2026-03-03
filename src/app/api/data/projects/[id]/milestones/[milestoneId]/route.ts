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

/** PATCH: update milestone. Body: partial { name, slug, content } */
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

    if (updates.length === 0) {
      return NextResponse.json(rowToMilestone(existing));
    }
    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now);
    values.push(mid, projectId);

    db.prepare(
      `UPDATE milestones SET ${updates.join(", ")} WHERE id = ? AND project_id = ?`
    ).run(...values);

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
