/**
 * Ideas data access: read/write from DB only.
 */
import { getDb, type IdeaRow } from "@/lib/db";

export interface IdeaRecord {
  id: number;
  title: string;
  description: string;
  category: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

function rowToRecord(r: IdeaRow): IdeaRecord {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    source: r.source,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function getIdeas(projectId?: string): IdeaRecord[] {
  const db = getDb();
  const rows = projectId
    ? (db.prepare("SELECT * FROM ideas WHERE project_id = ? OR project_id IS NULL ORDER BY id ASC").all(projectId) as IdeaRow[])
    : (db.prepare("SELECT * FROM ideas ORDER BY id ASC").all() as IdeaRow[]);
  return rows.map(rowToRecord);
}

export function getIdeaById(id: number): IdeaRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as IdeaRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createIdea(data: {
  title: string;
  description: string;
  category?: string;
  source?: string;
  project_id?: string | null;
}): IdeaRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const category = ["saas", "iaas", "paas", "website", "webapp", "webshop", "other"].includes(String(data.category))
    ? data.category
    : "other";
  const source = ["template", "ai", "manual"].includes(String(data.source)) ? data.source : "manual";
  const r = db
    .prepare(
      `INSERT INTO ideas (project_id, title, description, category, body, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.project_id ?? null, data.title.trim(), data.description.trim(), category, null, source, now, now);
  const id = r.lastInsertRowid as number;
  const row = db.prepare("SELECT * FROM ideas WHERE id = ?").get(id) as IdeaRow;
  return rowToRecord(row);
}
