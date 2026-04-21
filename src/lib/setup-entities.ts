import {
  getProjectConfig,
  getProjectDoc,
  listProjectFiles,
  readProjectFile,
  readProjectFileOrEmpty,
  setProjectConfig,
  setProjectDoc,
  type ProjectConfigType,
  type ProjectDocType,
} from "@/lib/api-projects";

export type SetupEntityType = "prompts" | "skills" | "rules" | "mcp" | "agents";

export type SetupEntityRecord = {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

type SetupMigrationState = {
  migrated: Partial<Record<SetupEntityType, boolean>>;
};

const SETUP_MIGRATIONS_CONFIG_TYPE: ProjectConfigType = "setup_migrations";
const SETUP_MCP_CONFIG_TYPE: ProjectConfigType = "setup_mcp_servers";

const DOC_TYPE_BY_ENTITY: Record<Exclude<SetupEntityType, "mcp">, ProjectDocType> = {
  prompts: "setup_prompts",
  skills: "setup_skills",
  rules: "setup_rules",
  agents: "setup_agents",
};

const NOW = () => new Date().toISOString();

function safeParseArray(value: string): SetupEntityRecord[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<SetupEntityRecord> => typeof item === "object" && item != null)
      .map((item) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        description: String(item.description ?? ""),
        content: String(item.content ?? ""),
        category: item.category ? String(item.category) : undefined,
        createdAt: String(item.createdAt ?? NOW()),
        updatedAt: String(item.updatedAt ?? NOW()),
      }))
      .filter((item) => item.id.trim() !== "" && item.name.trim() !== "");
  } catch {
    return [];
  }
}

function nextId(entityType: SetupEntityType): string {
  return `${entityType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getMigrationState(projectId: string): Promise<SetupMigrationState> {
  const res = await getProjectConfig(projectId, SETUP_MIGRATIONS_CONFIG_TYPE);
  const raw = res.config as Partial<SetupMigrationState> | undefined;
  const migrated = raw?.migrated ?? {};
  return { migrated };
}

async function setMigrated(projectId: string, entityType: SetupEntityType): Promise<void> {
  const state = await getMigrationState(projectId);
  await setProjectConfig(projectId, SETUP_MIGRATIONS_CONFIG_TYPE, {
    migrated: {
      ...state.migrated,
      [entityType]: true,
    },
  });
}

async function listFromDb(projectId: string, entityType: SetupEntityType): Promise<SetupEntityRecord[]> {
  if (entityType === "mcp") {
    const res = await getProjectConfig(projectId, SETUP_MCP_CONFIG_TYPE);
    const records = Array.isArray((res.config as { records?: unknown[] })?.records)
      ? ((res.config as { records?: unknown[] }).records as SetupEntityRecord[])
      : [];
    return records.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
  const docType = DOC_TYPE_BY_ENTITY[entityType];
  const raw = await getProjectDoc(projectId, docType);
  return safeParseArray(raw).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

async function writeToDb(projectId: string, entityType: SetupEntityType, records: SetupEntityRecord[]): Promise<void> {
  if (entityType === "mcp") {
    await setProjectConfig(projectId, SETUP_MCP_CONFIG_TYPE, { records });
    return;
  }
  const docType = DOC_TYPE_BY_ENTITY[entityType];
  await setProjectDoc(projectId, docType, JSON.stringify(records, null, 2));
}

function parseAgentFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const name = block.match(/name:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim();
  const description = block.match(/description:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim();
  return { name, description };
}

async function importLegacyRecords(
  projectId: string,
  projectPath: string,
  entityType: SetupEntityType
): Promise<SetupEntityRecord[]> {
  const now = NOW();
  if (entityType === "mcp") {
    const raw = await readProjectFileOrEmpty(projectId, ".cursor/mcp.json", projectPath);
    if (!raw.trim()) return [];
    return [
      {
        id: nextId("mcp"),
        name: "Project MCP Servers",
        description: "Imported from .cursor/mcp.json",
        content: raw,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  if (entityType === "rules") {
    const entries = await listProjectFiles(projectId, ".cursor/rules", projectPath).catch(() => []);
    const out: SetupEntityRecord[] = [];
    for (const entry of entries) {
      if (entry.isDirectory || !entry.name.endsWith(".json")) continue;
      const content = await readProjectFile(projectId, `.cursor/rules/${entry.name}`, projectPath).catch(() => "");
      if (!content.trim()) continue;
      out.push({
        id: nextId("rules"),
        name: entry.name.replace(/\.json$/i, ""),
        description: "Imported from .cursor/rules",
        content,
        createdAt: now,
        updatedAt: now,
      });
    }
    return out;
  }

  if (entityType === "agents") {
    const entries = await listProjectFiles(projectId, ".cursor/agents", projectPath).catch(() => []);
    const out: SetupEntityRecord[] = [];
    for (const entry of entries) {
      if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
      const content = await readProjectFile(projectId, `.cursor/agents/${entry.name}`, projectPath).catch(() => "");
      if (!content.trim()) continue;
      const frontmatter = parseAgentFrontmatter(content);
      out.push({
        id: nextId("agents"),
        name: frontmatter.name ?? entry.name.replace(/\.md$/i, ""),
        description: frontmatter.description ?? "Imported from .cursor/agents",
        content,
        createdAt: now,
        updatedAt: now,
      });
    }
    return out;
  }

  if (entityType === "skills") {
    // No reliable project-level legacy source; start empty.
    return [];
  }

  // prompts import: read project-level data/prompts markdown companions if present.
  const promptEntries = await listProjectFiles(projectId, "data/prompts", projectPath).catch(() => []);
  const prompts: SetupEntityRecord[] = [];
  for (const entry of promptEntries) {
    if (entry.isDirectory || !entry.name.endsWith(".prompt.md")) continue;
    const content = await readProjectFile(projectId, `data/prompts/${entry.name}`, projectPath).catch(() => "");
    if (!content.trim()) continue;
    prompts.push({
      id: nextId("prompts"),
      name: entry.name.replace(/\.prompt\.md$/i, ""),
      description: "Imported from data/prompts",
      content,
      createdAt: now,
      updatedAt: now,
    });
  }
  return prompts;
}

export async function ensureSetupEntityMigrated(
  projectId: string,
  projectPath: string,
  entityType: SetupEntityType
): Promise<void> {
  const state = await getMigrationState(projectId);
  if (state.migrated[entityType]) return;

  const current = await listFromDb(projectId, entityType);
  if (current.length > 0) {
    await setMigrated(projectId, entityType);
    return;
  }

  const imported = await importLegacyRecords(projectId, projectPath, entityType);
  if (imported.length > 0) {
    await writeToDb(projectId, entityType, imported);
  }
  await setMigrated(projectId, entityType);
}

export async function listSetupEntities(projectId: string, entityType: SetupEntityType): Promise<SetupEntityRecord[]> {
  return listFromDb(projectId, entityType);
}

export async function createSetupEntity(
  projectId: string,
  entityType: SetupEntityType,
  data: Omit<SetupEntityRecord, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const now = NOW();
  const current = await listFromDb(projectId, entityType);
  current.unshift({
    id: nextId(entityType),
    name: data.name.trim(),
    description: data.description,
    content: data.content,
    category: data.category,
    createdAt: now,
    updatedAt: now,
  });
  await writeToDb(projectId, entityType, current);
}

export async function updateSetupEntity(
  projectId: string,
  entityType: SetupEntityType,
  id: string,
  patch: Partial<Pick<SetupEntityRecord, "name" | "description" | "content" | "category">>
): Promise<void> {
  const current = await listFromDb(projectId, entityType);
  const next = current.map((record) =>
    record.id === id
      ? {
          ...record,
          ...patch,
          name: patch.name != null ? patch.name.trim() : record.name,
          updatedAt: NOW(),
        }
      : record
  );
  await writeToDb(projectId, entityType, next);
}

export async function deleteSetupEntity(projectId: string, entityType: SetupEntityType, id: string): Promise<void> {
  const current = await listFromDb(projectId, entityType);
  await writeToDb(
    projectId,
    entityType,
    current.filter((record) => record.id !== id)
  );
}
