/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import { parseAndValidate, improveIdeaSchema } from "@/lib/api-validation";
import {
  buildIdeaUpgradePrompt,
  parseIdeaUpgradeOutput,
  type IdeaUpgradeContext,
} from "@/lib/idea-upgrade-prompt";
import { getDb, type IdeaRow, type MilestoneRow, type PlanTicketRow } from "@/lib/db";
import { repoAllowed } from "@/lib/repo-allowed";
import { getProjectById } from "@/lib/data/projects";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

/**
 * POST: Tailor a raw idea to the project's current state (name, description, ideas, milestones, tickets).
 * Returns { improvedTitle, improvedDescription }. Body: rawIdea (required), promptOnly (optional).
 * Uses params.id to load project context from DB and projects.json.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = await parseAndValidate(request, improveIdeaSchema);
  if (!parsed.success) return parsed.response;
  const { rawIdea, promptOnly } = parsed.data;

  const { id: projectId } = await params;
  const project = getProjectById(projectId);
  const projectName = project?.name ?? "Project";
  const projectDescription = project?.description ?? null;

  const db = getDb();
  const ideaRows = db
    .prepare("SELECT id, title, description FROM ideas WHERE project_id = ? ORDER BY id ASC")
    .all(projectId) as Pick<IdeaRow, "id" | "title" | "description">[];
  const milestoneRows = db
    .prepare("SELECT id, name, content FROM milestones WHERE project_id = ? ORDER BY name ASC")
    .all(projectId) as Pick<MilestoneRow, "id" | "name" | "content">[];
  const ticketRows = db
    .prepare(
      "SELECT id, title, description FROM plan_tickets WHERE project_id = ? ORDER BY number ASC LIMIT 50"
    )
    .all(projectId) as Pick<PlanTicketRow, "id" | "title" | "description">[];

  const context: IdeaUpgradeContext = {
    projectName,
    projectDescription,
    existingIdeas: ideaRows.map((r) => ({ title: r.title, description: r.description })),
    milestones: milestoneRows.map((r) => ({ name: r.name, content: r.content })),
    tickets: ticketRows.map((r) => ({ title: r.title, description: r.description })),
  };

  const rawFirstLine = rawIdea.trim().split(/\r?\n/)[0] ?? "";
  const rawRest = rawIdea
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .join("\n")
    .trim();
  const rawTitle = rawFirstLine || "Untitled idea";
  const rawDescription = rawRest;

  const prompt = buildIdeaUpgradePrompt(rawTitle, rawDescription, context);

  if (promptOnly) {
    return NextResponse.json({ prompt });
  }

  const cwd = process.cwd();
  let workDir = path.resolve(cwd);
  if (project?.repoPath?.trim()) {
    const resolvedRepo = path.resolve(project.repoPath.trim());
    if (repoAllowed(resolvedRepo, cwd)) {
      workDir = resolvedRepo;
    }
  }

  try {
    const raw = await runAgentPrompt(workDir, prompt);
    const { improvedTitle, improvedDescription } = parseIdeaUpgradeOutput(raw, rawTitle);
    return NextResponse.json({ improvedTitle, improvedDescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }
}
