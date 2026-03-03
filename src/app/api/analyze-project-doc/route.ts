/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { runAgentPrompt } from "@/lib/agent-runner";
import { stripTerminalArtifacts, MIN_DOCUMENT_LENGTH } from "@/lib/strip-terminal-artifacts";
import { repoAllowed } from "@/lib/repo-allowed";
import { getProjectById, getProjects } from "@/lib/data/projects";

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

/** Strip markdown code fence if present (e.g. ```md ... ```). */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(\w*)\n?([\s\S]*?)```$/);
  if (fence) return fence[2].trim();
  return trimmed;
}

/** Placeholder written when the agent returns no usable document (so the file is not left empty). */
function placeholderForOutputPath(outputPath: string, reason: "no_output" | "agent_failed"): string {
  const name = path.basename(outputPath, path.extname(outputPath));
  const title = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const reasonText =
    reason === "agent_failed"
      ? "The agent CLI could not be run. When starting the Next server, set AGENT_CLI_PATH to the full path of your agent binary (or ensure `agent` is in PATH). See .cursor/documentation/analyze-agent-setup.md for details."
      : "The agent did not output the full document (only terminal or summary output). Run Analyze again when the agent is configured to print the document to stdout.";
  return `# ${title}\n\n*This document could not be generated. ${reasonText}*\n`;
}

/** Build a short "current project data" string from the repo: top-level layout + tech stack if present. */
function getCurrentProjectData(resolvedRepo: string): string {
  const lines: string[] = [];
  try {
    const entries = fs.readdirSync(resolvedRepo, { withFileTypes: true });
    const names = entries
      .filter((e) => !e.name.startsWith(".") || e.name === ".cursor")
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort((a, b) => a.localeCompare(b));
    if (names.length) {
      lines.push("Repo layout (top level):", names.join(" "), "");
    }
  } catch {
    // ignore
  }
  const techPath = path.join(resolvedRepo, ".cursor", "technologies", "tech-stack.json");
  if (fs.existsSync(techPath) && fs.statSync(techPath).isFile()) {
    try {
      const tech = fs.readFileSync(techPath, "utf-8").trim().slice(0, 2000);
      if (tech) lines.push("Tech stack (.cursor/technologies/tech-stack.json):", tech, "");
    } catch {
      // ignore
    }
  }
  const pkgPath = path.join(resolvedRepo, "package.json");
  if (fs.existsSync(pkgPath) && fs.statSync(pkgPath).isFile()) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
      const name = pkg.name;
      const scripts = pkg.scripts as Record<string, string> | undefined;
      const deps = pkg.dependencies as Record<string, string> | undefined;
      const parts = [name && `name: ${name}`];
      if (scripts && typeof scripts === "object") {
        parts.push("scripts: " + Object.keys(scripts).slice(0, 12).join(", "));
      }
      if (deps && typeof deps === "object") {
        parts.push("deps: " + Object.keys(deps).slice(0, 15).join(", "));
      }
      if (parts.length) lines.push("package.json:", parts.filter(Boolean).join(" | "), "");
    } catch {
      // ignore
    }
  }
  return lines.length ? ["Current project data:", "", ...lines].join("\n") : "";
}

export async function POST(request: NextRequest) {
  let body: { projectId?: string; repoPath?: string; promptPath: string; outputPath: string; promptOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const repoPathFromBody = typeof body.repoPath === "string" ? body.repoPath.trim() : "";
  const promptPath = typeof body.promptPath === "string" ? body.promptPath.trim() : "";
  const outputPath = typeof body.outputPath === "string" ? body.outputPath.trim() : "";
  const promptOnly = body.promptOnly === true;

  if (!promptPath || !outputPath) {
    return NextResponse.json(
      { error: "Missing promptPath or outputPath" },
      { status: 400 }
    );
  }

  const cwd = process.cwd();
  let repoPath: string;
  let projectName: string;

  const project = projectId ? getProjectById(projectId) : null;
  if (project?.repoPath?.trim()) {
    repoPath = project.repoPath.trim();
    projectName = project.name ?? "Project";
  } else if (repoPathFromBody) {
    repoPath = repoPathFromBody;
    projectName = project?.name ?? "Project";
  } else {
    return NextResponse.json(
      { error: "Project not found. Provide projectId (and ensure project exists in data/projects.json) or repoPath in the request body." },
      { status: 404 }
    );
  }

  const resolvedRepo = path.resolve(repoPath);
  if (!repoAllowed(resolvedRepo, cwd)) {
    return NextResponse.json(
      { error: "Project repo is outside app directory; analysis not allowed" },
      { status: 403 }
    );
  }

  const promptContent = readFileInRepo(repoPath, promptPath, cwd);
  if (!promptContent || !promptContent.trim()) {
    return NextResponse.json(
      {
        code: "PROMPT_NOT_FOUND",
        error: `Prompt not found at ${promptPath}`,
        hint: "Run Initialize on this project to unzip the Next.js starter, or add the prompt file manually.",
      },
      { status: 400 }
    );
  }

  const currentContent = readFileInRepo(repoPath, outputPath, cwd) ?? "";
  const projectData = getCurrentProjectData(resolvedRepo);

  const systemPrompt = `You are a senior engineer. You will be given the project name, current project data (repo layout, tech stack, package.json), the current content of a project document, and instructions (a prompt). Your task is to output the updated document content only.

Rules:
- Your output will REPLACE the entire file. The file is overwritten with whatever you output. Do not merge or append; output the complete new document. (Current content is provided for context only.)
- Output ONLY the full document content that should be written to the file. Every section, every heading, every bullet point — the complete markdown. Do NOT output a summary, "Summary of what's in place", "Summary of what was done", or any meta-description. The output must be the entire document (e.g. for ideas.md: 600+ lines with all tiers, ideas, and sections), not a description of it.
- No preamble, no code fence, no terminal-style banners or logs.
- Follow the structure and format specified in the instructions (e.g. for ideas.md: use #### N. Title for ideas, or - [ ] for bullets, so the UI can parse it).
- Output valid markdown that matches the target file's expected format. Base the update on the current project data and the instructions.`;

  const userContent = [
    `Project: ${projectName}`,
    "",
    projectData || "",
    projectData ? "---" : "",
    "",
    "Current content of the target file (to update):",
    currentContent || "(empty or file does not exist yet)",
    "",
    "---",
    "",
    "Instructions (prompt):",
    "",
    promptContent.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const combinedPrompt = [systemPrompt, "", userContent].join("\n");

  if (promptOnly) {
    return NextResponse.json({ prompt: combinedPrompt });
  }

  try {
    const raw = await runAgentPrompt(resolvedRepo, combinedPrompt);
    const withoutArtifacts = stripTerminalArtifacts(raw);
    const content = stripCodeFence(withoutArtifacts);

    if (content.length < MIN_DOCUMENT_LENGTH) {
      const placeholder = placeholderForOutputPath(outputPath, "no_output");
      const written = writeFileInRepo(repoPath, outputPath, placeholder, cwd);
      if (!written) {
        return NextResponse.json(
          { error: "Failed to write placeholder (invalid path or permission)" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        placeholder: true,
        message: "Agent output was only terminal or summary; a placeholder was written. Run Analyze again when the agent outputs the full document.",
      });
    }

    const written = writeFileInRepo(repoPath, outputPath, content, cwd);
    if (!written) {
      return NextResponse.json(
        { error: "Failed to write output file (invalid path or permission)" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const placeholder = placeholderForOutputPath(outputPath, "agent_failed");
    const written = writeFileInRepo(repoPath, outputPath, placeholder, cwd);
    if (written) {
      return NextResponse.json({
        ok: true,
        placeholder: true,
        message: `Agent failed (${message}). A placeholder was written. Ensure the agent CLI is in PATH or set AGENT_CLI_PATH.`,
      });
    }
    return NextResponse.json(
      {
        error: "Agent request failed",
        detail: message,
        hint: "Ensure the agent CLI is installed and in PATH (or set AGENT_CLI_PATH).",
      },
      { status: 502 }
    );
  }
}
