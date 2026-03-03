/** route component. */
import { NextRequest, NextResponse } from "next/server";
import type { Project } from "@/types/project";
import type { ArchitectureRecord } from "@/types/architecture";
import type { DesignRecord as ExportDesignRecord } from "@/types/design";
import { getDb } from "@/lib/db";
import { getProjectById } from "@/lib/data/projects";
import { getPrompts } from "@/lib/data/prompts";
import { getTickets } from "@/lib/data/tickets";
import { getDesigns } from "@/lib/data/designs";
import { getArchitectures } from "@/lib/data/architectures";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

/** Export payload: project plus all linked entities as full records */
export interface ProjectExport {
  exportedAt: string;
  project: Project;
  prompts: { id: number; title: string; content?: string; category?: string | null; tags?: string[] | null; created_at?: string | null; updated_at?: string | null }[];
  tickets: { id: string; title: string; description?: string; status: string; priority?: number; created_at?: string; updated_at?: string }[];
  ideas: { id: number; title: string; description: string; category: string; source?: string; created_at?: string; updated_at?: string }[];
  designs: ExportDesignRecord[];
  architectures: ArchitectureRecord[];
}

/** GET: export project as JSON including all linked entities (full records) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const promptsList = getPrompts();
    const ticketsList = getTickets();
    const ideaIds = Array.isArray(project.ideaIds) ? project.ideaIds : [];
    const ideasList: { id: number; title: string; description: string; category: string; source?: string; created_at?: string; updated_at?: string }[] =
      ideaIds.length === 0
        ? []
        : (getDb()
            .prepare(
              `SELECT id, title, description, category, source, created_at, updated_at FROM ideas WHERE id IN (${ideaIds.map(() => "?").join(",")})`
            )
            .all(...ideaIds) as { id: number; title: string; description: string; category: string; source?: string; created_at?: string; updated_at?: string }[]);
    const designsList = getDesigns();
    const architecturesList = getArchitectures();

    const promptIds = Array.isArray(project.promptIds) ? project.promptIds : [];
    const ticketIds = Array.isArray(project.ticketIds) ? project.ticketIds : [];
    const designIds = Array.isArray((project as { designIds?: string[] }).designIds) ? (project as { designIds: string[] }).designIds : [];
    const architectureIds = Array.isArray((project as { architectureIds?: string[] }).architectureIds) ? (project as { architectureIds: string[] }).architectureIds : [];

    const prompts = (promptIds as number[])
      .map((pid) => promptsList.find((p) => p.id === pid))
      .filter(Boolean) as ProjectExport["prompts"];
    const tickets = ticketIds
      .map((tid) => ticketsList.find((t) => t.id === tid))
      .filter(Boolean) as ProjectExport["tickets"];
    const ideas = ideaIds
      .map((iid) => ideasList.find((i) => i.id === iid))
      .filter(Boolean) as ProjectExport["ideas"];
    const designs = designIds
      .map((did) => designsList.find((d) => d.id === did))
      .filter(Boolean) as ExportDesignRecord[];
    const architectures = architectureIds
      .map((aid) => architecturesList.find((a) => a.id === aid))
      .filter(Boolean) as ArchitectureRecord[];

    const payload: ProjectExport = {
      exportedAt: new Date().toISOString(),
      project,
      prompts,
      tickets,
      ideas,
      designs,
      architectures,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error("Project export error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to export project" },
      { status: 500 }
    );
  }
}
