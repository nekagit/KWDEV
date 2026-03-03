/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

/** Direct subdirectories under dir only (one level). Include every entry that is a directory or symlink by type; no existsSync so we don't skip valid folders on macOS. */
function listSubdirPaths(dir: string): string[] {
  const folders: string[] = [];
  try {
    const names = fs.readdirSync(dir, { withFileTypes: true });
    for (const d of names) {
      if (d.name === "." || d.name === "..") continue;
      if (!d.isDirectory() && !d.isSymbolicLink()) continue;
      const full = path.join(dir, d.name);
      folders.push(path.resolve(full));
    }
  } catch {
    // ignore unreadable dir
  }
  return folders;
}

function getDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

/** Read all projects root paths from data/february-dir.txt (one path per line). Highest priority. */
function februaryDirCandidatesFromDataFile(): string[] {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, "february-dir.txt");
  const out: string[] = [];
  try {
    if (!fs.existsSync(filePath)) return out;
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const resolved = path.resolve(trimmed);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) out.push(resolved);
    }
  } catch {
    // ignore
  }
  return out;
}

/**
 * GET /api/data/february-folders
 * Returns all subdirectories of the configured projects root. No filter by name.
 * Priority: data/february-dir.txt, then FEBRUARY_DIR env, then parent of cwd.
 */
export async function GET() {
  try {
    const candidates: string[] = [];
    const addCandidate = (p: string, resolveSymlinks: boolean) => {
      const abs = path.resolve(p);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return;
      const toAdd = resolveSymlinks
        ? (() => {
            try {
              const r = fs.realpathSync(abs);
              return fs.existsSync(r) && fs.statSync(r).isDirectory() ? r : abs;
            } catch {
              return abs;
            }
          })()
        : abs;
      if (toAdd && !candidates.includes(toAdd)) candidates.push(toAdd);
    };
    const fromFile = februaryDirCandidatesFromDataFile();
    fromFile.forEach((p) => addCandidate(p, false));
    if (candidates.length === 0 && process.env.FEBRUARY_DIR?.trim()) {
      const envPaths = process.env.FEBRUARY_DIR.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
      envPaths.forEach((p) => addCandidate(p, false));
    }
    if (candidates.length === 0) {
      addCandidate(path.resolve(process.cwd(), ".."), false);
    }

    const seen = new Set<string>();
    const folders: string[] = [];
    for (const dir of candidates) {
      for (const full of listSubdirPaths(dir)) {
        if (!seen.has(full)) {
          seen.add(full);
          folders.push(full);
        }
      }
    }
    folders.sort();
    return NextResponse.json({ folders });
  } catch (e) {
    console.error("february-folders error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list project folders" },
      { status: 500 }
    );
  }
}
