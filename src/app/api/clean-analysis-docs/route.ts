/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { stripTerminalArtifacts } from "@/lib/strip-terminal-artifacts";
import { DEFAULT_ANALYZE_JOBS } from "@/lib/api-projects";
import { repoAllowed } from "@/lib/repo-allowed";
import { getProjects } from "@/lib/data/projects";

export const dynamic = "force-static";

function readFileInRepo(repoPath: string, relativePath: string, cwd: string): string | null {
  const normalized = path.normalize(relativePath.trim());
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  const resolvedRepo = path.resolve(repoPath);
  if (!repoAllowed(resolvedRepo, cwd)) return null;
  const resolved = path.resolve(resolvedRepo, normalized);
  if (!resolved.startsWith(resolvedRepo)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return fs.readFileSync(resolved, "utf-8");
}

function writeFileInRepo(repoPath: string, relativePath: string, content: string, cwd: string): boolean {
  const normalized = path.normalize(relativePath.trim());
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return false;
  const resolvedRepo = path.resolve(repoPath);
  if (!repoAllowed(resolvedRepo, cwd)) return false;
  const resolved = path.resolve(resolvedRepo, normalized);
  if (!resolved.startsWith(resolvedRepo)) return false;
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, content, "utf-8");
  return true;
}

/** POST: strip terminal/cursor output from all analysis .md files in the repo. */
export async function POST(request: NextRequest) {
  let body: { projectId?: string; repoPath?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const repoPathFromBody = typeof body.repoPath === "string" ? body.repoPath.trim() : "";

  const cwd = process.cwd();
  let repoPath: string;

  const projects = getProjects();
  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  if (project?.repoPath?.trim()) {
    repoPath = project.repoPath.trim();
  } else if (repoPathFromBody) {
    repoPath = repoPathFromBody;
  } else {
    return NextResponse.json(
      { error: "Provide projectId or repoPath in the request body." },
      { status: 400 }
    );
  }

  const resolvedRepo = path.resolve(repoPath);
  if (!repoAllowed(resolvedRepo, cwd)) {
    return NextResponse.json(
      { error: "Repo path is not allowed (outside app directory)." },
      { status: 403 }
    );
  }

  const outputPaths = DEFAULT_ANALYZE_JOBS.map((j) => j.outputPath);
  const cleaned: string[] = [];
  const skipped: string[] = [];

  for (const outputPath of outputPaths) {
    const raw = readFileInRepo(repoPath, outputPath, cwd);
    if (raw === null) {
      skipped.push(outputPath);
      continue;
    }
    const stripped = stripTerminalArtifacts(raw);
    // Always overwrite with stripped content so cursor/terminal output is removed
    // (even if little or no document content remains).
    const written = writeFileInRepo(repoPath, outputPath, stripped, cwd);
    if (written) {
      cleaned.push(outputPath);
    } else {
      skipped.push(outputPath);
    }
  }

  return NextResponse.json({
    ok: true,
    cleaned: cleaned.length,
    skipped: skipped.length,
    cleanedPaths: cleaned,
    skippedPaths: skipped,
  });
}
