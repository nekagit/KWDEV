/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type IdeaRow } from "@/lib/db";
import type { IdeaRecord } from "../route";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "1" }];
}

function rowToRecord(r: IdeaRow): IdeaRecord {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category as IdeaRecord["category"],
    source: r.source as IdeaRecord["source"],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** GET: single idea by id (numeric, passed as URL segment) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid idea id" }, { status: 400 });
    }
    const db = getDb();
    const row = db.prepare("SELECT * FROM ideas WHERE id = ?").get(numId) as IdeaRow | undefined;
    if (!row) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }
    return NextResponse.json(rowToRecord(row));
  } catch (e) {
    console.error("Idea GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load idea" },
      { status: 500 }
    );
  }
}

/** DELETE: remove idea */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid idea id" }, { status: 400 });
    }
    const db = getDb();
    const r = db.prepare("DELETE FROM ideas WHERE id = ?").run(numId);
    if (r.changes === 0) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Idea DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete idea" },
      { status: 500 }
    );
  }
}
