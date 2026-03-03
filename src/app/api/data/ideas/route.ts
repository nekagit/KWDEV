/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getDb, type IdeaRow } from "@/lib/db";

export const dynamic = "force-static";

export type IdeaCategory =
  | "saas"
  | "iaas"
  | "paas"
  | "website"
  | "webapp"
  | "webshop"
  | "other";

export interface IdeaRecord {
  id: number;
  title: string;
  description: string;
  category: IdeaCategory;
  source: "template" | "ai" | "manual";
  created_at?: string;
  updated_at?: string;
}

function rowToRecord(r: IdeaRow): IdeaRecord {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category as IdeaCategory,
    source: r.source as "template" | "ai" | "manual",
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

const GENERAL_DEVELOPMENT_TITLE = "General Development";

/** GET: list ideas. Ensures "General Development" idea exists globally. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const db = getDb();
    let rows: IdeaRow[];
    if (projectId) {
      rows = db
        .prepare("SELECT * FROM ideas WHERE project_id = ? OR project_id IS NULL ORDER BY id ASC")
        .all(projectId) as IdeaRow[];
    } else {
      rows = db.prepare("SELECT * FROM ideas ORDER BY id ASC").all() as IdeaRow[];
    }
    const hasGeneralDev = rows.some((r) => r.title === GENERAL_DEVELOPMENT_TITLE);
    if (!hasGeneralDev) {
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO ideas (project_id, title, description, category, body, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(null, GENERAL_DEVELOPMENT_TITLE, "", "other", null, "manual", now, now);
      if (projectId) {
        rows = db
          .prepare("SELECT * FROM ideas WHERE project_id = ? OR project_id IS NULL ORDER BY id ASC")
          .all(projectId) as IdeaRow[];
      } else {
        rows = db.prepare("SELECT * FROM ideas ORDER BY id ASC").all() as IdeaRow[];
      }
    }
    return NextResponse.json(rows.map(rowToRecord));
  } catch (e) {
    console.error("Ideas GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load ideas" },
      { status: 500 }
    );
  }
}

const CATEGORIES = new Set<string>([
  "saas", "iaas", "paas", "website", "webapp", "webshop", "other",
]);
const SOURCES = new Set<string>(["template", "ai", "manual"]);

/** POST: create or update. Body: { id?: number, title, description, category, source, project_id? } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = CATEGORIES.has(String(body.category)) ? body.category : "other";
    const source = body.source !== undefined && SOURCES.has(String(body.source))
      ? body.source
      : undefined;
    const projectId = typeof body.project_id === "string" ? body.project_id : null;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const existingId = typeof body.id === "number" ? body.id : undefined;

    if (existingId !== undefined) {
      const existing = db.prepare("SELECT * FROM ideas WHERE id = ?").get(existingId) as IdeaRow | undefined;
      if (existing) {
        db.prepare(
          "UPDATE ideas SET title = ?, description = ?, category = ?, source = ?, updated_at = ? WHERE id = ?"
        ).run(title, description, category, source ?? existing.source, now, existingId);
        const row = db.prepare("SELECT * FROM ideas WHERE id = ?").get(existingId) as IdeaRow;
        return NextResponse.json(rowToRecord(row));
      }
    }

    const r = db
      .prepare(
        `INSERT INTO ideas (project_id, title, description, category, body, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(projectId, title, description, category, null, source ?? "manual", now, now);
    const id = r.lastInsertRowid as number;
    const row = db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as IdeaRow;
    return NextResponse.json(rowToRecord(row));
  } catch (e) {
    console.error("Ideas POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save idea" },
      { status: 500 }
    );
  }
}
