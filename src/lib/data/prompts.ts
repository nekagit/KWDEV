/**
 * Prompts data access: read/write from DB only.
 */
import { getDb, type PromptRow } from "@/lib/db";
import { safeJsonArray } from "@/lib/db-json";

export interface PromptRecordRecord {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function rowToRecord(r: PromptRow): PromptRecordRecord {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    category: r.category ?? null,
    tags: safeJsonArray<string>(r.tags),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function getPrompts(): PromptRecordRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM prompts ORDER BY id ASC").all() as PromptRow[];
  return rows.map(rowToRecord);
}

export function getPromptById(id: number): PromptRecordRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(id) as PromptRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createOrUpdatePrompt(data: {
  id?: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
}): PromptRecordRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const title = data.title.trim();
  const content = data.content;
  const category = data.category ?? null;
  const tags = data.tags != null ? JSON.stringify(data.tags) : null;

  if (data.id !== undefined) {
    const existing = db.prepare("SELECT * FROM prompts WHERE id = ?").get(data.id) as PromptRow | undefined;
    if (existing) {
      db.prepare(
        "UPDATE prompts SET title=?, content=?, category=?, tags=?, updated_at=? WHERE id=?"
      ).run(title, content, category, tags, now, data.id);
      const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(data.id) as PromptRow;
      return rowToRecord(row);
    }
  }

  let attempts = 0;
  while (attempts < 3) {
    const maxId = db.prepare("SELECT COALESCE(MAX(id), 0) AS m FROM prompts").get() as { m: number };
    const nextId = maxId.m + 1;
    try {
      db.prepare(
        "INSERT INTO prompts (id, title, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(nextId, title, content, category, tags, now, now);
      const row = db.prepare("SELECT * FROM prompts WHERE id = ?").get(nextId) as PromptRow;
      return rowToRecord(row);
    } catch (error) {
      attempts += 1;
      if (attempts >= 3) throw error;
    }
  }
  throw new Error("Failed to allocate prompt id");
}

export function deletePrompt(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM prompts WHERE id = ?").run(id);
  return result.changes > 0;
}
