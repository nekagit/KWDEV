/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { repoAllowed } from "@/lib/repo-allowed";
import { getProjectById } from "@/lib/data/projects";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

/** GET: read a file from the project's repo (e.g. .cursor/7. planner/tickets.md). Only allows paths under project repo when repo is under cwd. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const repoPath = project.repoPath?.trim();
    if (!repoPath) {
      return NextResponse.json(
        { error: "Project has no repo path; cannot read repo files" },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get("path");
    if (!relativePath || typeof relativePath !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    const normalized = path.normalize(relativePath.trim());
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const cwd = process.cwd();
    const resolvedRepo = path.resolve(repoPath);
    if (!repoAllowed(resolvedRepo, cwd)) {
      return NextResponse.json(
        { error: "Project repo is outside app directory; file read not allowed" },
        { status: 403 }
      );
    }
    const resolved = path.resolve(resolvedRepo, normalized);
    if (!resolved.startsWith(resolvedRepo)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const content = fs.readFileSync(resolved, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    console.error("Project file read error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read file" },
      { status: 500 }
    );
  }
}

/** POST: write a file under the project's repo. Same path/security checks as GET. Creates parent dirs if needed. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const repoPath = project.repoPath?.trim();
    if (!repoPath) {
      return NextResponse.json(
        { error: "Project has no repo path; cannot write repo files" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const relativePath = typeof body?.path === "string" ? body.path.trim() : "";
    const content = typeof body?.content === "string" ? body.content : "";
    if (!relativePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const cwd = process.cwd();
    const resolvedRepo = path.resolve(repoPath);
    if (!repoAllowed(resolvedRepo, cwd)) {
      return NextResponse.json(
        { error: "Project repo is outside app directory; file write not allowed" },
        { status: 403 }
      );
    }
    const resolved = path.resolve(resolvedRepo, normalized);
    if (!resolved.startsWith(resolvedRepo)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Project file write error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to write file" },
      { status: 500 }
    );
  }
}
