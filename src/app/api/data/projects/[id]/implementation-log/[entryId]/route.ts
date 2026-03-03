/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type ImplementationLogRow } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder", entryId: "1" }];
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

/** PATCH: set implementation log entry status (accept or decline). Body: { status: "accepted" | "declined" } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: projectId, entryId } = await params;
    const entryIdNum = parseInt(entryId, 10);
    if (Number.isNaN(entryIdNum) || entryIdNum < 1) {
      return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
    }
    const body = await request.json();
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json(
        { error: "Body must include status: 'accepted' or 'declined'" },
        { status: 400 }
      );
    }
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM implementation_log WHERE id = ? AND project_id = ?")
      .get(entryIdNum, projectId) as ImplementationLogRow | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Implementation log entry not found" }, { status: 404 });
    }
    db.prepare("UPDATE implementation_log SET status = ? WHERE id = ? AND project_id = ?").run(
      status,
      entryIdNum,
      projectId
    );
    const row = db
      .prepare("SELECT * FROM implementation_log WHERE id = ?")
      .get(entryIdNum) as ImplementationLogRow;
    return NextResponse.json(rowToEntry(row));
  } catch (e) {
    console.error("Implementation log PATCH error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update implementation log entry" },
      { status: 500 }
    );
  }
}
