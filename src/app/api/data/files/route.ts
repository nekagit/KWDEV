/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

function findRoot(): string {
  const cwd = process.cwd();
  const scriptInCwd = path.join(cwd, "script");
  const dataInCwd = path.join(cwd, "data");
  if (fs.existsSync(scriptInCwd) && fs.existsSync(dataInCwd) && fs.statSync(dataInCwd).isDirectory())
    return cwd;
  const parent = path.join(cwd, "..");
  const scriptInParent = path.join(parent, "script");
  const dataInParent = path.join(parent, "data");
  if (fs.existsSync(scriptInParent) && fs.existsSync(dataInParent) && fs.statSync(dataInParent).isDirectory())
    return parent;
  return cwd;
}
const ROOT = findRoot();
const SCRIPT_DIR = path.join(ROOT, "script");
const DATA_DIR = path.join(ROOT, "data");

function safeJoin(base: string, ...segments: string[]): string | null {
  const resolved = path.resolve(base, ...segments);
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

export async function GET() {
  try {
    const scripts: { name: string; path: string }[] = [];
    if (fs.existsSync(SCRIPT_DIR) && fs.statSync(SCRIPT_DIR).isDirectory()) {
      for (const name of fs.readdirSync(SCRIPT_DIR)) {
        const full = path.join(SCRIPT_DIR, name);
        if (fs.statSync(full).isFile()) {
          scripts.push({ name, path: path.relative(ROOT, full) });
        }
      }
    }
    scripts.sort((a, b) => a.name.localeCompare(b.name));

    const jsonFiles: { name: string; path: string }[] = [];
    if (fs.existsSync(DATA_DIR) && fs.statSync(DATA_DIR).isDirectory()) {
      for (const name of fs.readdirSync(DATA_DIR)) {
        if (!name.endsWith(".json")) continue;
        const full = path.join(DATA_DIR, name);
        if (fs.statSync(full).isFile()) {
          jsonFiles.push({ name, path: path.relative(ROOT, full) });
        }
      }
    }
    jsonFiles.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ scripts, jsonFiles });
  } catch (e) {
    console.error("API data/files error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
