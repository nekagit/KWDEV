/** route component. */
import { NextRequest, NextResponse } from "next/server";
import type { Project, EntityCategory, ProjectEntityCategories } from "@/types/project";
import type { DesignRecord } from "@/types/design";
import type { ArchitectureRecord } from "@/types/architecture";
import { getDb } from "@/lib/db";
import { getProjectById, updateProject, deleteProject } from "@/lib/data/projects";
import { getPrompts } from "@/lib/data/prompts";
import { getTickets } from "@/lib/data/tickets";
import { getDesigns } from "@/lib/data/designs";
import { getArchitectures } from "@/lib/data/architectures";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

type ResolvedEntityCategory = EntityCategory;

type ResolvedProject = Project & {
  prompts: ({ id: number; title: string; content?: string } & ResolvedEntityCategory)[];
  tickets: ({ id: string; title: string; status: string; description?: string } & ResolvedEntityCategory)[];

  ideas: ({ id: number; title: string; description: string; category: string } & ResolvedEntityCategory)[];
  designs: (DesignRecord & ResolvedEntityCategory)[];
  architectures: ({ id: string; name: string; description?: string; category?: string } & ResolvedEntityCategory)[];
};

function getCategory(ec: ProjectEntityCategories | undefined, kind: keyof ProjectEntityCategories, entityId: string | number): EntityCategory | undefined {
  const map = ec?.[kind];
  if (!map || typeof map !== "object") return undefined;
  const key = typeof entityId === "number" ? String(entityId) : entityId;
  return map[key];
}

/** GET: single project with resolved prompts, tickets, ideas */
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
    const ideaIdsForResolve = Array.isArray(project.ideaIds) ? project.ideaIds : [];
    const ideasList: { id: number; title: string; description: string; category: string }[] =
      ideaIdsForResolve.length === 0
        ? []
        : getDb()
            .prepare(
              `SELECT id, title, description, category FROM ideas WHERE id IN (${ideaIdsForResolve.map(() => "?").join(",")})`
            )
            .all(...ideaIdsForResolve) as { id: number; title: string; description: string; category: string }[];

    const designsList = getDesigns();
    const architecturesList = getArchitectures();

    const promptIds = Array.isArray(project.promptIds) ? project.promptIds : [];
    const ticketIds = Array.isArray(project.ticketIds) ? project.ticketIds : [];

    const ideaIds = Array.isArray(project.ideaIds) ? project.ideaIds : [];
    const designIds = Array.isArray((project as { designIds?: string[] }).designIds) ? (project as { designIds: string[] }).designIds : [];
    const architectureIds = Array.isArray((project as { architectureIds?: string[] }).architectureIds) ? (project as { architectureIds: string[] }).architectureIds : [];
    const entityCategories = project.entityCategories;

    const resolved: ResolvedProject = {
      ...project,
      designIds,
      architectureIds,
      promptIds,
      ticketIds,

      ideaIds,
      prompts: (promptIds as number[])
        .map((pid) => {
          const p = promptsList.find((pr) => pr.id === pid);
          if (!p) return null;
          const cat = getCategory(entityCategories, "prompts", pid);
          return { id: p.id, title: p.title, content: p.content, ...cat };
        })
        .filter(Boolean) as ResolvedProject["prompts"],
      tickets: ticketIds
        .map((tid) => {
          const t = ticketsList.find((tr) => tr.id === tid);
          if (!t) return null;
          const cat = getCategory(entityCategories, "tickets", tid);
          return { id: t.id, title: t.title, status: t.status, description: t.description, ...cat };
        })
        .filter(Boolean) as ResolvedProject["tickets"],

      ideas: ideaIds
        .map((iid) => {
          const i = ideasList.find((ir) => Number(ir.id) === iid);
          if (!i) return null;
          const cat = getCategory(entityCategories, "ideas", String(iid));
          return { ...i, ...cat };
        })
        .filter(Boolean) as ResolvedProject["ideas"],
      designs: designIds
        .map((did) => {
          const d = designsList.find((dr) => dr.id === did);
          if (!d) return null;
          const cat = getCategory(entityCategories, "designs", did);
          return { ...d, ...cat };
        })
        .filter(Boolean) as ResolvedProject["designs"],
      architectures: architectureIds
        .map((aid) => {
          const a = architecturesList.find((ar) => ar.id === aid);
          if (!a) return null;
          const cat = getCategory(entityCategories, "architectures", aid);
          return { ...a, ...cat };
        })
        .filter(Boolean) as ResolvedProject["architectures"],
    };

    return NextResponse.json(resolved);
  } catch (e) {
    console.error("Project GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load project" },
      { status: 500 }
    );
  }
}

/** PUT: update project. Body: partial Project */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const specFilesValid =
      Array.isArray(body.specFiles) &&
        body.specFiles.every(
          (e: unknown) => {
            if (typeof e !== "object" || e == null || !("name" in e) || !("path" in e)) return false;
            const o = e as { name: unknown; path: unknown; content?: unknown };
            return typeof o.name === "string" && typeof o.path === "string" && (o.content === undefined || typeof o.content === "string");
          }
        )
        ? (body.specFiles as { name: string; path: string; content?: string }[])
        : undefined;
    const specFilesTicketsValid = Array.isArray(body.specFilesTickets)
      ? (body.specFilesTickets as unknown[]).filter((s): s is string => typeof s === "string")
      : undefined;

    let runPortValue: number | undefined;
    if (body.runPort !== undefined && body.runPort !== null) {
      const raw = body.runPort;
      const num = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
      if (!Number.isNaN(num) && num > 0 && num < 65536) runPortValue = num;
    }

    const updates: Partial<Project> = {
      ...(typeof body.name === "string" && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: typeof body.description === "string" ? body.description.trim() : undefined }),
      ...(body.repoPath !== undefined && { repoPath: typeof body.repoPath === "string" ? body.repoPath.trim() || undefined : undefined }),
      ...(body.runPort !== undefined && { runPort: runPortValue }),
      ...(Array.isArray(body.promptIds) && { promptIds: body.promptIds.filter((n: unknown) => typeof n === "number") }),
      ...(Array.isArray(body.ticketIds) && { ticketIds: body.ticketIds.filter((s: unknown) => typeof s === "string") }),
      ...(Array.isArray(body.ideaIds) && { ideaIds: body.ideaIds.filter((n: unknown) => typeof n === "number") }),
      ...(Array.isArray(body.designIds) && { designIds: body.designIds.filter((s: unknown) => typeof s === "string") }),
      ...(Array.isArray(body.architectureIds) && { architectureIds: body.architectureIds.filter((s: unknown) => typeof s === "string") }),
      ...(body.entityCategories !== undefined && typeof body.entityCategories === "object" && body.entityCategories !== null && { entityCategories: body.entityCategories as ProjectEntityCategories }),
      ...(specFilesValid !== undefined && { specFiles: specFilesValid }),
      ...(specFilesTicketsValid !== undefined && { specFilesTickets: specFilesTicketsValid }),
    };
    const updated = updateProject(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Project PUT error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

/** PATCH: same as PUT (partial merge). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

/** DELETE: remove project */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Project DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
