/** route component. Seeds one template project via DB (prompts, tickets, ideas, designs, architectures, projects). */
import { NextResponse } from "next/server";
import type { Project, ProjectEntityCategories, EntityCategory } from "@/types/project";
import type { ArchitectureRecord } from "@/types/architecture";
import type { DesignSection, SectionKind } from "@/types/design";
import { createProject } from "@/lib/data/projects";
import { createOrUpdatePrompt } from "@/lib/data/prompts";
import { createTicket } from "@/lib/data/tickets";
import { createIdea } from "@/lib/data/ideas";
import { createOrUpdateDesign } from "@/lib/data/designs";
import { createOrUpdateArchitecture } from "@/lib/data/architectures";

export const dynamic = "force-static";

const RECURRING_PROMPT_TITLES = [
  "Sprint planning",
  "Code review checklist",
  "Bug triage",
  "Refactor module",
  "Add tests",
  "Update docs",
  "Deploy staging",
  "Security scan",
  "Performance audit",
  "User feedback review",
];

const RECURRING_PROMPT_CONTENT =
  "Follow the project's established patterns. Read .cursor/* and FEATURES.md first. Break work into small steps. Commit after each logical unit. Run tests and build before pushing.";

const PHASES = ["Discovery", "Design", "Build", "Launch", "Review"] as const;
const TICKET_CATEGORIZERS = ["backlog", "task", "spike", "bug", "review"] as const;

/** POST: seed one template project with 10 prompts, categorized multiphased tickets (for 1 idea, 1 design, 1 architecture) */
export async function POST() {
  try {
    const now = new Date().toISOString();

    const newPromptRecords: { id: number }[] = [];
    for (const title of RECURRING_PROMPT_TITLES) {
      const record = createOrUpdatePrompt({
        title,
        content: RECURRING_PROMPT_CONTENT,
        category: "template",
      });
      newPromptRecords.push(record);
    }
    const promptIds = newPromptRecords.map((p) => p.id);

    const ticketsPerPhase = 6;
    const totalTickets = PHASES.length * ticketsPerPhase;
    const newTicketIds: string[] = [];
    for (let i = 0; i < totalTickets; i++) {
      const phase = PHASES[i % PHASES.length];
      const statuses = ["backlog", "in_progress", "done", "blocked"] as const;
      const categorizer = TICKET_CATEGORIZERS[i % TICKET_CATEGORIZERS.length];
      const t = createTicket({
        title: `${phase} – ${categorizer} ${(i % ticketsPerPhase) + 1}`,
        description: `Template task for ${phase}, categorizer ${categorizer}. Part of seed data.`,
        status: statuses[i % statuses.length],
        priority: i % 5,
      });
      newTicketIds.push(t.id);
    }

    const newIdea = createIdea({
      title: "Template project idea",
      description: "A template project for demos and testing, with recurring prompts, tickets, one idea, one design, and one architecture definition.",
      category: "webapp",
      source: "template",
    });

    const designSections: DesignSection[] = [
      { id: "hero-1", kind: "hero" as SectionKind, title: "Hero", description: "Main hero section", order: 0, enabled: true },
      { id: "feat-1", kind: "features" as SectionKind, title: "Features", description: "Feature highlights", order: 1, enabled: true },
      { id: "cta-1", kind: "cta" as SectionKind, title: "Call to action", description: "CTA block", order: 2, enabled: true },
      { id: "footer-1", kind: "footer" as SectionKind, title: "Footer", description: "Site footer", order: 3, enabled: true },
    ];
    const newDesign = createOrUpdateDesign({
      name: "Template landing page",
      config: {
        projectName: "Template Project",
        templateId: "landing",
        pageTitle: "Welcome",
        colors: {
          primary: "#0f172a",
          secondary: "#334155",
          accent: "#3b82f6",
          background: "#ffffff",
          surface: "#f8fafc",
          text: "#0f172a",
          textMuted: "#64748b",
        },
        typography: {
          headingFont: "Inter",
          bodyFont: "Inter",
          baseSize: "16px",
          scale: "1.25",
        },
        layout: {
          maxWidth: "1200px",
          spacing: "1.5rem",
          borderRadius: "0.5rem",
          navStyle: "centered",
        },
        sections: designSections,
        notes: "Template design for seed data.",
      },
    });

    const newArchitecture = createOrUpdateArchitecture({
      name: "Clean Architecture (template)",
      category: "clean",
      description:
        "Clean Architecture separates concerns into layers: Domain (entities, use cases), Application (application logic), Infrastructure (frameworks, DB, external APIs), and Presentation (UI). Dependencies point inward; inner layers know nothing of outer layers.",
      practices: `- **Dependency rule**: Source code dependencies point only inward (toward higher-level policies).
- **Entities**: Enterprise business rules; no dependencies on frameworks or UI.
- **Use cases**: Application-specific business rules; orchestrate data flow.
- **Interface adapters**: Convert data between use cases and external systems (e.g. presenters, gateways).
- **Frameworks & drivers**: DB, UI, web; only the outermost layer.
- **Testability**: Core logic testable without UI, DB, or external services.`,
      scenarios: `- Medium to large applications with clear domain logic.
- When you need to swap UI or persistence without changing business rules.
- When team wants clear boundaries and testability.`,
      references: "Robert C. Martin, Clean Architecture (book).",
      anti_patterns: "Putting business logic in controllers or DB layer; letting outer layers leak into domain.",
      examples: "Domain layer: entities + use case interfaces. Infrastructure: implementations of repositories and external APIs. Presentation: controllers that call use cases.",
    });

    const buildEntityCategories = (): ProjectEntityCategories => {
      const promptsMap: Record<string, EntityCategory> = {};
      promptIds.forEach((pid) => {
        promptsMap[String(pid)] = { phase: "Recurring", step: "Ongoing", organization: "Shared", categorizer: "template", other: "prompt" };
      });
      const ticketsMap: Record<string, EntityCategory> = {};
      newTicketIds.forEach((tid, i) => {
        const phase = PHASES[Math.floor(i / ticketsPerPhase)];
        const step = String((i % 3) + 1);
        const categorizer = TICKET_CATEGORIZERS[i % TICKET_CATEGORIZERS.length];
        ticketsMap[tid] = { phase, step, organization: "Team", categorizer, other: "task" };
      });
      const ideasMap: Record<string, EntityCategory> = {};
      ideasMap[String(newIdea.id)] = { phase: "Discovery", step: "1", organization: "Product", categorizer: "idea", other: "concept" };
      const designsMap: Record<string, EntityCategory> = {};
      designsMap[newDesign.id] = { phase: "Design", step: "1", organization: "Design", categorizer: "design", other: "ui-spec" };
      const architecturesMap: Record<string, EntityCategory> = {};
      architecturesMap[newArchitecture.id] = { phase: "Design", step: "1", organization: "Tech", categorizer: "architecture", other: "best-practice" };
      return { prompts: promptsMap, tickets: ticketsMap, ideas: ideasMap, designs: designsMap, architectures: architecturesMap };
    };

    const newProject = createProject({
      name: "Template project",
      description: "Seed project with 10 prompts, categorized multiphased tickets, for 1 idea, 1 design, 1 architecture.",
      promptIds,
      ticketIds: newTicketIds,
      ideaIds: [newIdea.id],
      designIds: [newDesign.id],
      architectureIds: [newArchitecture.id],
      entityCategories: buildEntityCategories(),
    });

    return NextResponse.json({
      ok: true,
      project: newProject,
      counts: {
        prompts: newPromptRecords.length,
        tickets: newTicketIds.length,
        ideas: 1,
        designs: 1,
        architectures: 1,
      },
    });
  } catch (e) {
    console.error("Seed template error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to seed template" },
      { status: 500 }
    );
  }
}
