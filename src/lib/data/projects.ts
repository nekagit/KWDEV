/**
 * Projects data access: read/write from DB only.
 */
import type { Project, ProjectEntityCategories } from "@/types/project";
import { getDb, type ProjectRow } from "@/lib/db";

function getProjectLinkedIds(db: ReturnType<typeof getDb>, projectId: string) {
  const promptIds = db
    .prepare("SELECT prompt_id FROM project_prompt_links WHERE project_id = ? ORDER BY prompt_id ASC")
    .all(projectId) as Array<{ prompt_id: number }>;
  const ticketIds = db
    .prepare("SELECT ticket_id FROM project_ticket_links WHERE project_id = ? ORDER BY ticket_id ASC")
    .all(projectId) as Array<{ ticket_id: string }>;
  const ideaIds = db
    .prepare("SELECT idea_id FROM project_idea_links WHERE project_id = ? ORDER BY idea_id ASC")
    .all(projectId) as Array<{ idea_id: number }>;
  const designIds = db
    .prepare("SELECT design_id FROM project_design_links WHERE project_id = ? ORDER BY design_id ASC")
    .all(projectId) as Array<{ design_id: string }>;
  const architectureIds = db
    .prepare("SELECT architecture_id FROM project_architecture_links WHERE project_id = ? ORDER BY architecture_id ASC")
    .all(projectId) as Array<{ architecture_id: string }>;
  return {
    promptIds: promptIds.map((row) => row.prompt_id),
    ticketIds: ticketIds.map((row) => row.ticket_id),
    ideaIds: ideaIds.map((row) => row.idea_id),
    designIds: designIds.map((row) => row.design_id),
    architectureIds: architectureIds.map((row) => row.architecture_id),
  };
}

function rowToProject(db: ReturnType<typeof getDb>, r: ProjectRow): Project {
  const links = getProjectLinkedIds(db, r.id);
  const promptIds = links.promptIds.length > 0 ? links.promptIds : safeJsonArray<number>(r.prompt_ids);
  const ticketIds = links.ticketIds.length > 0 ? links.ticketIds : safeJsonArray<string>(r.ticket_ids);
  const ideaIds = links.ideaIds.length > 0 ? links.ideaIds : safeJsonArray<number>(r.idea_ids);
  const designIds = links.designIds.length > 0 ? links.designIds : safeJsonArray<string>(r.design_ids);
  const architectureIds =
    links.architectureIds.length > 0
      ? links.architectureIds
      : safeJsonArray<string>(r.architecture_ids);
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
    prompt_ids: "[]",
    ticket_ids: "[]",
    idea_ids: "[]",
    design_ids: "[]",
    architecture_ids: "[]",
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
  return rows.map((row) => rowToProject(db, row));
}

export function getProjectById(id: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  return row ? rowToProject(db, row) : null;
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
  updateProject(id, {
    promptIds: full.promptIds,
    ticketIds: full.ticketIds,
    ideaIds: full.ideaIds,
    designIds: full.designIds,
    architectureIds: full.architectureIds,
  });
  return full;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!existing) return null;
  const current = rowToProject(db, existing);
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
    `UPDATE projects SET name=?, description=?, repo_path=?, run_port=?, entity_categories=?, spec_files=?, spec_files_tickets=?, updated_at=? WHERE id=?`
  ).run(
    row.name,
    row.description,
    row.repo_path,
    row.run_port,
    row.entity_categories,
    row.spec_files,
    row.spec_files_tickets,
    row.updated_at,
    id
  );
  const now = new Date().toISOString();
  db.prepare("DELETE FROM project_prompt_links WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_ticket_links WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_idea_links WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_design_links WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_architecture_links WHERE project_id = ?").run(id);
  const insertPrompt = db.prepare(
    "INSERT INTO project_prompt_links (project_id, prompt_id, created_at) VALUES (?, ?, ?)"
  );
  const insertTicket = db.prepare(
    "INSERT INTO project_ticket_links (project_id, ticket_id, created_at) VALUES (?, ?, ?)"
  );
  const insertIdea = db.prepare(
    "INSERT INTO project_idea_links (project_id, idea_id, created_at) VALUES (?, ?, ?)"
  );
  const insertDesign = db.prepare(
    "INSERT INTO project_design_links (project_id, design_id, created_at) VALUES (?, ?, ?)"
  );
  const insertArchitecture = db.prepare(
    "INSERT INTO project_architecture_links (project_id, architecture_id, created_at) VALUES (?, ?, ?)"
  );
  for (const value of merged.promptIds ?? []) insertPrompt.run(id, value, now);
  for (const value of merged.ticketIds ?? []) insertTicket.run(id, value, now);
  for (const value of merged.ideaIds ?? []) insertIdea.run(id, value, now);
  for (const value of merged.designIds ?? []) insertDesign.run(id, value, now);
  for (const value of merged.architectureIds ?? []) insertArchitecture.run(id, value, now);
  return merged;
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  db.prepare("DELETE FROM plan_tickets WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM milestones WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM plan_kanban_state WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM implementation_log WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_docs WHERE project_id = ?").run(id);
  db.prepare("DELETE FROM project_configs WHERE project_id = ?").run(id);
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}
