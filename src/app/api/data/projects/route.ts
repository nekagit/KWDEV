/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { parseAndValidate, createProjectSchema } from "@/lib/api-validation";
import { getProjects, createProject } from "@/lib/data/projects";

export const dynamic = "force-static";

function toErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "Unknown error");
  if (typeof raw !== "string" || !raw.trim()) return "Failed to load projects";
  if (raw.trim() === "Internal Server Error") return "Failed to load projects (check data dir and terminal)";
  return raw;
}

/** GET: list all projects */
export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json(projects);
  } catch (e) {
    const message = toErrorMessage(e);
    console.error("Projects GET error:", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: create a new project. Body: { name, description?, repoPath?, promptIds?, ticketIds?, ideaIds? } */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseAndValidate(request, createProjectSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const newProject = createProject({
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      repoPath: body.repoPath?.trim() || undefined,
      promptIds: body.promptIds ?? [],
      ticketIds: body.ticketIds ?? [],
      ideaIds: body.ideaIds ?? [],
      designIds: body.designIds ?? [],
      architectureIds: body.architectureIds ?? [],
    });
    return NextResponse.json(newProject);
  } catch (e) {
    console.error("Projects POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
