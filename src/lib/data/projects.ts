/**
 * Projects data access: read/write from DB only.
 */
import type { Project, ProjectEntityCategories } from "@/types/project";
import { getDb, type ProjectRow } from "@/lib/db";

function rowToProject(r: ProjectRow): Project {
  const promptIds = safeJsonArray<number>(r.prompt_ids);
  const ticketIds = safeJsonArray<string>(r.ticket_ids);
  const ideaIds = safeJsonArray<number>(r.idea_ids);
  const designIds = safeJsonArray<string>(r.design_ids);
  const architectureIds = safeJsonArray<string>(r.architecture_ids);
  const entityCategories = r.entity_categories
    ? (JSON.parse(r.entity_categories) as ProjectEntityCategories)
    : undefined;
  const specFiles = r.spec_files
    ? (JSON.parse(r.spec_files) as { name: string; path: string; content?: string }[])
    : undefined;
  const specFilesTickets = r.spec_files_tickets
    ? (JSON.parse(r.spec_files_tickets) as string[])
    : undefined;
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    repoPath: r.repo_path ?? undefined,
    runPort: r.run_port ?? undefined,
    promptIds,
    ticketIds,
    ideaIds,
    designIds,
    architectureIds,
    entityCategories,
    specFiles,
    specFilesTickets,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function safeJsonArray<T>(s: string): T[] {
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function projectToRow(p: Project, now: string): ProjectRow {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    repo_path: p.repoPath ?? null,
    run_port: p.runPort ?? null,
    prompt_ids: JSON.stringify(p.promptIds ?? []),
    ticket_ids: JSON.stringify(p.ticketIds ?? []),
    idea_ids: JSON.stringify(p.ideaIds ?? []),
    design_ids: JSON.stringify(p.designIds ?? []),
    architecture_ids: JSON.stringify(p.architectureIds ?? []),
    entity_categories: p.entityCategories ? JSON.stringify(p.entityCategories) : null,
    spec_files: p.specFiles ? JSON.stringify(p.specFiles) : null,
    spec_files_tickets: p.specFilesTickets ? JSON.stringify(p.specFilesTickets) : null,
    created_at: p.created_at ?? now,
    updated_at: p.updated_at ?? now,
  };
}

export function getProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProjectById(id: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(project: Omit<Project, "id" | "created_at" | "updated_at">): Project {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const full: Project = {
    ...project,
    id,
    promptIds: project.promptIds ?? [],
    ticketIds: project.ticketIds ?? [],
    ideaIds: project.ideaIds ?? [],
    designIds: project.designIds ?? [],
    architectureIds: project.architectureIds ?? [],
    created_at: now,
    updated_at: now,
  };
  const row = projectToRow(full, now);
  db.prepare(
    `INSERT INTO projects (id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.name,
    row.description,
    row.repo_path,
    row.run_port,
    row.prompt_ids,
    row.ticket_ids,
    row.idea_ids,
    row.design_ids,
    row.architecture_ids,
    row.entity_categories,
    row.spec_files,
    row.spec_files_tickets,
    row.created_at,
    row.updated_at
  );
  return full;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!existing) return null;
  const current = rowToProject(existing);
  const merged: Project = {
    ...current,
    ...updates,
    id: current.id,
    name: updates.name !== undefined ? updates.name : current.name,
    promptIds: updates.promptIds !== undefined ? updates.promptIds : current.promptIds,
    ticketIds: updates.ticketIds !== undefined ? updates.ticketIds : current.ticketIds,
    ideaIds: updates.ideaIds !== undefined ? updates.ideaIds : current.ideaIds,
    designIds: updates.designIds !== undefined ? updates.designIds : current.designIds,
    architectureIds: updates.architectureIds !== undefined ? updates.architectureIds : current.architectureIds,
    updated_at: new Date().toISOString(),
  };
  const row = projectToRow(merged, existing.created_at);
  db.prepare(
    `UPDATE projects SET name=?, description=?, repo_path=?, run_port=?, prompt_ids=?, ticket_ids=?, idea_ids=?, design_ids=?, architecture_ids=?, entity_categories=?, spec_files=?, spec_files_tickets=?, updated_at=? WHERE id=?`
  ).run(
    row.name,
    row.description,
    row.repo_path,
    row.run_port,
    row.prompt_ids,
    row.ticket_ids,
    row.idea_ids,
    row.design_ids,
    row.architecture_ids,
    row.entity_categories,
    row.spec_files,
    row.spec_files_tickets,
    row.updated_at,
    id
  );
  return merged;
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}
