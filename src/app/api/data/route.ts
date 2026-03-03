/** route component. Data tab: projects, prompts, tickets, designs from DB. */
import { NextResponse } from "next/server";
import { getProjects } from "@/lib/data/projects";
import { getPrompts } from "@/lib/data/prompts";
import { getTickets } from "@/lib/data/tickets";
import { getDesigns } from "@/lib/data/designs";

export const dynamic = "force-static";

/** Use a clear message so the client never sees generic "Internal Server Error". */
function toDataErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "Unknown error");
  if (typeof raw !== "string" || !raw.trim()) return "Failed to load data";
  if (raw.trim() === "Internal Server Error") return "Failed to load data (check data dir and terminal)";
  return raw;
}

export async function GET() {
  try {
    const projects = getProjects();
    const allProjects = projects.map((p) => p.id);
    const activeProjects = projects.map((p) => p.id);
    const prompts = getPrompts().map((p) => ({ id: p.id, title: p.title }));
    const designs = getDesigns();
    const tickets = getTickets();

    const kvEntries = [
      { key: "all_projects", value: JSON.stringify(allProjects, null, 2) },
      { key: "cursor_projects", value: JSON.stringify(activeProjects, null, 2) },
    ];

    return NextResponse.json({
      allProjects,
      activeProjects,
      prompts,
      tickets,
      designs,
      kvEntries,
    });
  } catch (e) {
    const message = toDataErrorMessage(e);
    console.error("API data load error:", message, e);
    return NextResponse.json(
      {
        allProjects: [],
        activeProjects: [],
        prompts: [],
        tickets: [],
        designs: [],
        kvEntries: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
