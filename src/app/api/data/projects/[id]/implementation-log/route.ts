/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type ImplementationLogRow } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

function rowToEntry(r: ImplementationLogRow) {
  return {
    id: r.id,
    project_id: r.project_id,
    run_id: r.run_id,
    ticket_number: r.ticket_number,
    ticket_title: r.ticket_title,
    milestone_id: r.milestone_id ?? undefined,
    idea_id: r.idea_id ?? undefined,
    completed_at: r.completed_at,
    files_changed: JSON.parse(r.files_changed) as { path: string; status: string }[],
    summary: r.summary,
    created_at: r.created_at,
    status: r.status ?? "pending",
  };
}

/** GET: list implementation log entries for project (newest first) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM implementation_log WHERE project_id = ? ORDER BY completed_at DESC, id DESC"
      )
      .all(projectId) as ImplementationLogRow[];
    return NextResponse.json(rows.map(rowToEntry));
  } catch (e) {
    console.error("Implementation log GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load implementation log" },
      { status: 500 }
    );
  }
}

/** POST: append entry. Body: run_id, ticket_number, ticket_title, milestone_id?, idea_id?, completed_at, files_changed[], summary */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const runId = typeof body.run_id === "string" ? body.run_id : "";
    const ticketNumber = typeof body.ticket_number === "number" ? body.ticket_number : 0;
    const ticketTitle = typeof body.ticket_title === "string" ? body.ticket_title.trim() : "";
    const completedAt = typeof body.completed_at === "string" ? body.completed_at : new Date().toISOString();
    const filesChanged = Array.isArray(body.files_changed)
      ? body.files_changed
      : [];
    const summary = typeof body.summary === "string" ? body.summary : "";
    const milestoneId =
      typeof body.milestone_id === "number" ? body.milestone_id : null;
    const ideaId = typeof body.idea_id === "number" ? body.idea_id : null;

    const db = getDb();
    const now = new Date().toISOString();
    const r = db
      .prepare(
        `INSERT INTO implementation_log (project_id, run_id, ticket_number, ticket_title, milestone_id, idea_id, completed_at, files_changed, summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        projectId,
        runId,
        ticketNumber,
        ticketTitle,
        milestoneId,
        ideaId,
        completedAt,
        JSON.stringify(filesChanged),
        summary,
        now
      );
    const id = r.lastInsertRowid as number;
    const row = db
      .prepare("SELECT * FROM implementation_log WHERE id = ?")
      .get(id) as ImplementationLogRow;
    return NextResponse.json(rowToEntry(row));
  } catch (e) {
    console.error("Implementation log POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to append implementation log" },
      { status: 500 }
    );
  }
}
