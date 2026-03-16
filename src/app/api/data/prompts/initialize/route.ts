/**
 * POST: Load all data/agents/*.md and data/prompts/*.prompt.md (and *.prompt.json)
 * into the prompts table. Optionally link new/updated prompts to a project via projectId.
 */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getPrompts, createOrUpdatePrompt } from "@/lib/data/prompts";
import { getProjectById, updateProject } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

function findDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

type FileEntry = { title: string; content: string };

function readAgentsDir(dataDir: string): FileEntry[] {
  const agentsDir = path.join(dataDir, "agents");
  const results: FileEntry[] = [];
  if (!fs.existsSync(agentsDir) || !fs.statSync(agentsDir).isDirectory()) return results;
  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    const fullPath = path.join(agentsDir, entry.name);
    const base = path.basename(entry.name, path.extname(entry.name));
    const title = `agents/${base}`;
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      results.push({ title, content });
    } catch {
      // skip unreadable files
    }
  }
  return results;
}

function readPromptsDir(dataDir: string): FileEntry[] {
  const promptsDir = path.join(dataDir, "prompts");
  const results: FileEntry[] = [];
  if (!fs.existsSync(promptsDir) || !fs.statSync(promptsDir).isDirectory()) return results;

  function walk(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        const isPromptMd = lower.endsWith(".prompt.md");
        const isPromptJson = lower.endsWith(".prompt.json");
        if (!isPromptMd && !isPromptJson) continue;
        const stem = isPromptMd
          ? path.basename(entry.name, ".prompt.md")
          : path.basename(entry.name, ".prompt.json");
        const title = `prompts/${stem}`;
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          results.push({ title, content });
        } catch {
          // skip
        }
      }
    }
  }
  walk(promptsDir, "");
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : undefined;

    const dataDir = findDataDir();
    const agentsEntries = readAgentsDir(dataDir);
    const promptsEntries = readPromptsDir(dataDir);
    const allEntries = [...agentsEntries, ...promptsEntries];

    const existing = getPrompts();
    const titleToId = new Map<string, number>();
    for (const p of existing) {
      titleToId.set(p.title.trim(), p.id);
    }

    let created = 0;
    let updated = 0;
    const touchedIds: number[] = [];

    for (const { title, content } of allEntries) {
      const id = titleToId.get(title);
      const record = createOrUpdatePrompt(
        id !== undefined ? { id, title, content } : { title, content }
      );
      if (id !== undefined) {
        updated++;
      } else {
        created++;
        titleToId.set(title, record.id);
      }
      touchedIds.push(record.id);
    }

    if (projectId && touchedIds.length > 0) {
      const project = getProjectById(projectId);
      if (project) {
        const existingIds = new Set(project.promptIds ?? []);
        touchedIds.forEach((id) => existingIds.add(id));
        updateProject(projectId, { promptIds: Array.from(existingIds) });
      }
    }

    return NextResponse.json({
      created,
      updated,
      total: allEntries.length,
      projectId: projectId ?? null,
    });
  } catch (e) {
    console.error("prompts/initialize POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to initialize prompts" },
      { status: 500 }
    );
  }
}
