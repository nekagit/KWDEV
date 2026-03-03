/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import type { Project, ProjectEntityCategories, EntityCategory } from "@/types/project";
import type { ArchitectureRecord } from "@/types/architecture";
import type { DesignConfig, SectionKind, PageTemplateId } from "@/types/design";
import { getIdeaById, createIdea } from "@/lib/data/ideas";
import { createOrUpdatePrompt } from "@/lib/data/prompts";
import { createTicket } from "@/lib/data/tickets";
import { createOrUpdateDesign } from "@/lib/data/designs";
import { createOrUpdateArchitecture } from "@/lib/data/architectures";
import { createProject } from "@/lib/data/projects";

export const dynamic = "force-static";

const ARCH_CATEGORIES = new Set<string>([
  "ddd", "tdd", "bdd", "dry", "solid", "kiss", "yagni",
  "clean", "hexagonal", "cqrs", "event_sourcing", "microservices",
  "rest", "graphql", "scenario",
]);
const PAGE_TEMPLATES = new Set<string>(["landing", "contact", "about", "pricing", "blog", "dashboard", "auth", "docs", "product", "custom"]);
const SECTION_KINDS = new Set<string>(["hero", "features", "testimonials", "cta", "pricing", "faq", "team", "contact-form", "footer", "nav", "content", "sidebar", "custom"]);
const NAV_STYLES = new Set<string>(["minimal", "centered", "full", "sidebar"]);

function buildPromptRecord(idea: { title: string; description: string; category: string }): string {
  return `You are a product and technical lead. Given the following product idea, generate a complete project specification as a single JSON object. Output ONLY valid JSON, no markdown, no code fence, no explanation.

## Idea
- Title: ${idea.title}
- Description: ${idea.description}
- Category: ${idea.category}

## Required output shape (exact keys)

{
  "prompts": [
    { "title": "string", "content": "string (2-4 sentences, actionable prompt for a developer)" }
  ],
  "tickets": [
    { "title": "string", "description": "string (1-3 sentences)", "status": "backlog" | "in_progress" | "done" }
  ],
  "design": {
    "projectName": "string (from idea title)",
    "templateId": "landing" | "dashboard" | "product" | "custom",
    "pageTitle": "string",
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "textMuted": "#hex"
    },
    "typography": { "headingFont": "string", "bodyFont": "string", "baseSize": "16px", "scale": "1.25" },
    "layout": { "maxWidth": "1200px", "spacing": "1rem", "borderRadius": "0.5rem", "navStyle": "minimal" | "centered" | "full" | "sidebar" },
    "sections": [
      { "id": "hero-1", "kind": "hero", "title": "Hero", "description": "optional", "order": 0, "enabled": true }
    ]
  },
  "architectures": [
    { "name": "string", "category": "clean" | "hexagonal" | "rest" | "microservices" | "scenario" | etc., "description": "string", "practices": "string", "scenarios": "string" }
  ]
}

## Rules
- Generate 5 to 8 prompts (recurring workflows useful for this idea).
- Generate 15 to 25 tickets (concrete tasks; mix statuses).
- design.sections: use kinds from hero, features, testimonials, cta, pricing, faq, team, contact-form, footer, nav, content, sidebar, custom. At least 3 sections.
- design.templateId must be one of: landing, dashboard, product, custom.
- Exactly 1 architecture; category one of: ddd, tdd, bdd, dry, solid, kiss, yagni, clean, hexagonal, cqrs, event_sourcing, microservices, rest, graphql, scenario.
- All content must be specific to the idea, not generic.`;
}

interface AIModel {
  prompts: { title: string; content: string }[];
  tickets: { title: string; description: string; status: string }[];
  design: {
    projectName: string;
    templateId: string;
    pageTitle: string;
    colors: Record<string, string>;
    typography: Record<string, string>;
    layout: Record<string, string>;
    sections: { id: string; kind: string; title: string; description?: string; order: number; enabled: boolean }[];
  };
  architectures: { name: string; category: string; description: string; practices: string; scenarios: string }[];
}

/** POST: generate a full project from an idea (or ideaId). Body: { idea: { title, description, category } } or { ideaId: number }. Use promptOnly: true to return { prompt } without running. */
export async function POST(request: NextRequest) {
  let body: { idea?: { title: string; description: string; category: string }; ideaId?: number; promptOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const promptOnly = body.promptOnly === true;

  let idea: { title: string; description: string; category: string };
  let ideaIdToLink: number;

  if (typeof body.ideaId === "number") {
    const found = getIdeaById(body.ideaId);
    if (!found) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }
    idea = { title: found.title, description: found.description, category: found.category };
    ideaIdToLink = found.id;
  } else if (body.idea && typeof body.idea.title === "string" && typeof body.idea.description === "string") {
    const category = ["saas", "iaas", "paas", "website", "webapp", "webshop", "other"].includes(String(body.idea.category))
      ? body.idea.category
      : "webapp";
    idea = { title: body.idea.title.trim(), description: body.idea.description.trim(), category };
    const newIdea = createIdea({ title: idea.title, description: idea.description, category, source: "ai" });
    ideaIdToLink = newIdea.id;
  } else {
    return NextResponse.json(
      { error: "Provide idea: { title, description, category } or ideaId (number)" },
      { status: 400 }
    );
  }

  const userPromptRecord = buildPromptRecord(idea);
  const combinedPrompt = `You output only a single valid JSON object with keys prompts, tickets, design, architectures. No markdown, no code fence, no other text.

${userPromptRecord}`;

  if (promptOnly) {
    return NextResponse.json({ prompt: combinedPrompt });
  }

  const cwd = path.resolve(process.cwd());
  let raw: string;
  try {
    raw = await runAgentPrompt(cwd, combinedPrompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;
  let parsed: AIModel;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json(
      { error: "Model did not return valid JSON", raw: raw.slice(0, 500) },
      { status: 502 }
    );
  }

  if (!parsed.prompts || !Array.isArray(parsed.prompts)) parsed.prompts = [];
  if (!parsed.tickets || !Array.isArray(parsed.tickets)) parsed.tickets = [];
  if (!parsed.design || typeof parsed.design !== "object") {
    parsed.design = {
      projectName: idea.title,
      templateId: "landing",
      pageTitle: idea.title,
      colors: { primary: "#0f172a", secondary: "#334155", accent: "#3b82f6", background: "#ffffff", surface: "#f8fafc", text: "#0f172a", textMuted: "#64748b" },
      typography: { headingFont: "Inter", bodyFont: "Inter", baseSize: "16px", scale: "1.25" },
      layout: { maxWidth: "1200px", spacing: "1rem", borderRadius: "0.5rem", navStyle: "centered" },
      sections: [
        { id: "hero-1", kind: "hero", title: "Hero", order: 0, enabled: true },
        { id: "feat-1", kind: "features", title: "Features", order: 1, enabled: true },
        { id: "cta-1", kind: "cta", title: "CTA", order: 2, enabled: true },
        { id: "footer-1", kind: "footer", title: "Footer", order: 3, enabled: true },
      ],
    };
  }
  if (!parsed.architectures || !Array.isArray(parsed.architectures)) parsed.architectures = [];

  const now = new Date().toISOString();

  const promptIds: number[] = [];
  for (const p of parsed.prompts.slice(0, 15)) {
    const record = createOrUpdatePrompt({
      title: String(p.title ?? "PromptRecord").slice(0, 200),
      content: String(p.content ?? "").slice(0, 8000),
      category: "template",
    });
    promptIds.push(record.id);
  }

  const newTicketIds: string[] = [];
  for (const t of parsed.tickets.slice(0, 50)) {
    const ticket = createTicket({
      title: String(t.title ?? "Task").slice(0, 500),
      description: String(t.description ?? "").slice(0, 5000),
      status: ["backlog", "in_progress", "done"].includes(String(t.status)) ? t.status : "backlog",
      priority: 0,
    });
    newTicketIds.push(ticket.id);
  }

  const d = parsed.design;
  const templateId = PAGE_TEMPLATES.has(String(d.templateId)) ? (d.templateId as PageTemplateId) : "landing";
  const navStyle = NAV_STYLES.has(String(d.layout?.navStyle)) ? d.layout.navStyle : "centered";
  const sections = (d.sections ?? []).slice(0, 20).map((s, i) => ({
    id: s.id || `sec-${i}`,
    kind: (SECTION_KINDS.has(String(s.kind)) ? s.kind : "content") as SectionKind,
    title: String(s.title ?? "Section").slice(0, 100),
    description: typeof s.description === "string" ? s.description.slice(0, 500) : undefined,
    order: typeof s.order === "number" ? s.order : i,
    enabled: s.enabled !== false,
  }));
  const designConfig: DesignConfig = {
    projectName: String(d.projectName ?? idea.title).slice(0, 200),
    templateId,
    pageTitle: String(d.pageTitle ?? idea.title).slice(0, 200),
    colors: {
      primary: String(d.colors?.primary ?? "#0f172a").slice(0, 20),
      secondary: String(d.colors?.secondary ?? "#334155").slice(0, 20),
      accent: String(d.colors?.accent ?? "#3b82f6").slice(0, 20),
      background: String(d.colors?.background ?? "#ffffff").slice(0, 20),
      surface: String(d.colors?.surface ?? "#f8fafc").slice(0, 20),
      text: String(d.colors?.text ?? "#0f172a").slice(0, 20),
      textMuted: String(d.colors?.textMuted ?? "#64748b").slice(0, 20),
    },
    typography: {
      headingFont: String(d.typography?.headingFont ?? "Inter").slice(0, 100),
      bodyFont: String(d.typography?.bodyFont ?? "Inter").slice(0, 100),
      baseSize: String(d.typography?.baseSize ?? "16px").slice(0, 20),
      scale: String(d.typography?.scale ?? "1.25").slice(0, 20),
    },
    layout: {
      maxWidth: String(d.layout?.maxWidth ?? "1200px").slice(0, 50),
      spacing: String(d.layout?.spacing ?? "1rem").slice(0, 50),
      borderRadius: String(d.layout?.borderRadius ?? "0.5rem").slice(0, 50),
      navStyle: navStyle as "minimal" | "centered" | "full" | "sidebar",
    },
    sections,
    notes: "Generated from idea",
  };
  const newDesign = createOrUpdateDesign({
    name: `${d.projectName ?? idea.title} — design`,
    config: designConfig,
  });
  const designId = newDesign.id;

  const archCategory = ARCH_CATEGORIES.has(String(parsed.architectures[0]?.category))
    ? parsed.architectures[0].category
    : "clean";
  const newArch = createOrUpdateArchitecture({
    name: String(parsed.architectures[0]?.name ?? "Architecture").slice(0, 200),
    category: archCategory as ArchitectureRecord["category"],
    description: String(parsed.architectures[0]?.description ?? "").slice(0, 2000),
    practices: String(parsed.architectures[0]?.practices ?? "").slice(0, 3000),
    scenarios: String(parsed.architectures[0]?.scenarios ?? "").slice(0, 3000),
  });
  const archId = newArch.id;

  const PHASES = ["Discovery", "Design", "Build", "Launch", "Review"] as const;
  const buildEntityCategories = (): ProjectEntityCategories => {
    const promptsMap: Record<string, EntityCategory> = {};
    promptIds.forEach((pid) => {
      promptsMap[String(pid)] = { phase: "Recurring", step: "Ongoing", organization: "Shared", categorizer: "ai-generated", other: "prompt" };
    });
    const ticketsMap: Record<string, EntityCategory> = {};
    newTicketIds.forEach((tid, i) => {
      const phase = PHASES[i % PHASES.length];
      const step = String((i % 5) + 1);
      ticketsMap[tid] = { phase, step, organization: "Team", categorizer: "backlog", other: "task" };
    });
    const ideasMap: Record<string, EntityCategory> = {};
    ideasMap[String(ideaIdToLink)] = { phase: "Discovery", step: "1", organization: "Product", categorizer: "idea", other: "concept" };
    const designsMap: Record<string, EntityCategory> = {};
    designsMap[designId] = { phase: "Design", step: "1", organization: "Design", categorizer: "design", other: "ui-spec" };
    const architecturesMap: Record<string, EntityCategory> = {};
    architecturesMap[archId] = { phase: "Design", step: "1", organization: "Tech", categorizer: "architecture", other: "best-practice" };
    return { prompts: promptsMap, tickets: ticketsMap, ideas: ideasMap, designs: designsMap, architectures: architecturesMap };
  };

  const newProject = createProject({
    name: idea.title,
    description: idea.description,
    promptIds,
    ticketIds: newTicketIds,
    ideaIds: [ideaIdToLink],
    designIds: [designId],
    architectureIds: [archId],
    entityCategories: buildEntityCategories(),
  });

  return NextResponse.json({
    project: newProject,
    counts: {
      prompts: promptIds.length,
      tickets: newTicketIds.length,
      ideas: 1,
      designs: 1,
      architectures: 1,
    },
  });
}
