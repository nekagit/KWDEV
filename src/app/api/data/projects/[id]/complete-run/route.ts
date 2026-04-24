/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

type CompletionBody = {
  ticket_id?: string;
  run_id?: string;
  ticket_number?: number;
  ticket_title?: string;
  milestone_id?: number | null;
  idea_id?: number | null;
  completed_at?: string;
  files_changed?: { path: string; status: string }[];
  summary?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = (await request.json()) as CompletionBody;
    const ticketId = typeof body.ticket_id === "string" ? body.ticket_id : "";
    const runId = typeof body.run_id === "string" ? body.run_id : "";
    const ticketNumber = typeof body.ticket_number === "number" ? body.ticket_number : 0;
    const ticketTitle = typeof body.ticket_title === "string" ? body.ticket_title.trim() : "";
    const completedAt =
      typeof body.completed_at === "string" ? body.completed_at : new Date().toISOString();
    const summary = typeof body.summary === "string" ? body.summary : "";
    const filesChanged = Array.isArray(body.files_changed) ? body.files_changed : [];
    const milestoneId = typeof body.milestone_id === "number" ? body.milestone_id : null;
    const ideaId = typeof body.idea_id === "number" ? body.idea_id : null;

    if (!ticketId || !runId || ticketNumber < 1 || !ticketTitle) {
      return NextResponse.json(
        { error: "ticket_id, run_id, ticket_number, and ticket_title are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE plan_tickets SET done = 1, status = 'Done', updated_at = ? WHERE id = ? AND project_id = ?"
      ).run(now, ticketId, projectId);
      const insertResult = db
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
      return insertResult.lastInsertRowid;
    });
    const entryId = tx() as number;
    return NextResponse.json({ ok: true, entry_id: entryId });
  } catch (e) {
    console.error("Complete run POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to complete run" },
      { status: 500 }
    );
  }
}
