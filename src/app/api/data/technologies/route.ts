/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdmZip = require("adm-zip");

export const dynamic = "force-static";

const ROOT = process.cwd();
const CURSOR_TECH = path.join(ROOT, ".cursor", "technologies");
/** Project template tech stack: folder (if extracted) or inside project_template.zip */
const PROJECT_TEMPLATE_TECH_DIR = path.join(ROOT, "project_template", ".cursor", "technologies");
const PROJECT_TEMPLATE_ZIP = path.join(ROOT, "project_template.zip");
const ZIP_TECH_PREFIX = "project_template/.cursor/technologies/";

/** Path is safe if it's a single filename or relative path under technologies (no ".."). */
function isSafeTechnologiesPath(relativePath: string): boolean {
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return false;
  const resolved = path.resolve(CURSOR_TECH, normalized);
  return resolved.startsWith(path.resolve(CURSOR_TECH));
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const names = fs.readdirSync(dir);
  const files: string[] = [];
  for (const name of names) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile()) files.push(name);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function readFileContent(dir: string, filename: string): string | null {
  const full = path.join(dir, filename);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  try {
    return fs.readFileSync(full, "utf-8");
  } catch {
    return null;
  }
}

/** Read tech files from project_template folder or from project_template.zip. Returns record of filename -> content. */
function readProjectTemplateTech(): Record<string, string> {
  const out: Record<string, string> = {};
  if (fs.existsSync(PROJECT_TEMPLATE_TECH_DIR) && fs.statSync(PROJECT_TEMPLATE_TECH_DIR).isDirectory()) {
    for (const name of listFiles(PROJECT_TEMPLATE_TECH_DIR)) {
      const content = readFileContent(PROJECT_TEMPLATE_TECH_DIR, name);
      if (content != null) out[name] = content;
    }
    return out;
  }
  if (!fs.existsSync(PROJECT_TEMPLATE_ZIP) || !fs.statSync(PROJECT_TEMPLATE_ZIP).isFile()) return out;
  try {
    const zip = new AdmZip(PROJECT_TEMPLATE_ZIP);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.replace(/\\/g, "/");
      if (!name.startsWith(ZIP_TECH_PREFIX)) continue;
      const filename = name.slice(ZIP_TECH_PREFIX.length).replace(/\/$/, "");
      if (!filename || filename.includes("/")) continue;
      const content = zip.readAsText(entry);
      if (content != null) out[filename] = content;
    }
  } catch {
    // ignore zip read errors
  }
  return out;
}

/** GET: return { files: { "tech-stack.json": "...", ... } } from .cursor/technologies and project_template (folder or zip). */
export async function GET() {
  try {
    const cursorFiles = listFiles(CURSOR_TECH);
    const projectTemplateTech = readProjectTemplateTech();
    const projectTemplateFilenames = Object.keys(projectTemplateTech);
    const allFilenames = [
      ...new Set([...cursorFiles, ...projectTemplateFilenames]),
    ];
    const files: Record<string, string> = {};
    for (const name of allFilenames) {
      const content =
        readFileContent(CURSOR_TECH, name) ??
        projectTemplateTech[name] ??
        null;
      if (content != null) files[name] = content;
    }
    return NextResponse.json({ files });
  } catch (e) {
    console.error("Technologies GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load technologies" },
      { status: 500 }
    );
  }
}

/** POST: body { path: string, content: string }. Write to .cursor/technologies/<path>. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPath = typeof body.path === "string" ? body.path.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    if (!rawPath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    if (!isSafeTechnologiesPath(rawPath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const targetPath = path.join(CURSOR_TECH, rawPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Technologies POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save" },
      { status: 500 }
    );
  }
}
