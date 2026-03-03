/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

/** GET: { inProgressIds: string[] } */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const row = db
      .prepare("SELECT in_progress_ids, updated_at FROM plan_kanban_state WHERE project_id = ?")
      .get(projectId) as { in_progress_ids: string; updated_at: string } | undefined;
    const inProgressIds: string[] = row?.in_progress_ids
      ? (JSON.parse(row.in_progress_ids) as string[])
      : [];
    return NextResponse.json({ inProgressIds });
  } catch (e) {
    console.error("Kanban state GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load kanban state" },
      { status: 500 }
    );
  }
}

/** PATCH: body { inProgressIds: string[] } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const inProgressIds = Array.isArray(body.inProgressIds)
      ? body.inProgressIds.filter((id: unknown) => typeof id === "string")
      : [];
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO plan_kanban_state (project_id, in_progress_ids, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(project_id) DO UPDATE SET in_progress_ids = excluded.in_progress_ids, updated_at = excluded.updated_at`
    ).run(projectId, JSON.stringify(inProgressIds), now);
    return NextResponse.json({ inProgressIds });
  } catch (e) {
    console.error("Kanban state PATCH error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update kanban state" },
      { status: 500 }
    );
  }
}
