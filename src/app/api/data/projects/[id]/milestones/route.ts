/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type MilestoneRow } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
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

/** GET: list milestones for project. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM milestones WHERE project_id = ? ORDER BY name ASC"
      )
      .all(projectId) as MilestoneRow[];
    return NextResponse.json(rows.map(rowToMilestone));
  } catch (e) {
    console.error("Milestones GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load milestones" },
      { status: 500 }
    );
  }
}

/** POST: create milestone. Body: name, idea_id, slug?, content? */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ideaId = typeof body.idea_id === "number" ? body.idea_id : typeof body.ideaId === "number" ? body.ideaId : null;
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    if (ideaId == null || !Number.isInteger(ideaId) || ideaId < 1) {
      return NextResponse.json(
        { error: "idea_id is required" },
        { status: 400 }
      );
    }
    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const content =
      typeof body.content === "string" ? body.content.trim() : null;

    const db = getDb();
    const linkedIdea = db
      .prepare("SELECT id FROM ideas WHERE id = ? AND project_id = ?")
      .get(ideaId, projectId) as { id: number } | undefined;
    if (!linkedIdea) {
      return NextResponse.json({ error: "idea_id does not exist for project" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const r = db
      .prepare(
        `INSERT INTO milestones (project_id, idea_id, name, slug, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(projectId, ideaId, name, slug, content, now, now);
    const id = r.lastInsertRowid as number;
    const row = db
      .prepare("SELECT * FROM milestones WHERE id = ?")
      .get(id) as MilestoneRow;
    return NextResponse.json(rowToMilestone(row));
  } catch (e) {
    console.error("Milestones POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create milestone" },
      { status: 500 }
    );
  }
}
