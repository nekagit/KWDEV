/** Dashboard metrics: counts from DB (projects, prompts, tickets, designs). */
import { NextResponse } from "next/server";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { parseTicketsMd } from "@/lib/todos-kanban";
import { getProjects } from "@/lib/data/projects";
import { getPrompts } from "@/lib/data/prompts";
import { getTickets } from "@/lib/data/tickets";
import { getDesigns } from "@/lib/data/designs";

export const dynamic = "force-static";

function findDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

async function safeReadFile(filePath: string, defaultValue: string = ""): Promise<string> {
  try {
    return await fsp.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultValue;
    }
    throw err;
  }
}

export interface DashboardMetricsResponse {
  tickets_count: number;
  prompts_count: number;
  designs_count: number;
  active_projects_count: number;
  all_projects_count: number;
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const dataDir = findDataDir();
    const resolveCwd = (p: string) => path.join(cwd, p);

    const projects = getProjects();
    const prompts = getPrompts();
    const designs = getDesigns();
    const ticketsFromDb = getTickets();

    // Tickets count: use global tickets table; fallback to markdown for legacy display if needed
    let ticketsCount = ticketsFromDb.length;
    if (ticketsCount === 0) {
      const ticketsDataPath = path.join(dataDir, "tickets.md");
      const ticketsPlannerPath = resolveCwd(".cursor/7. planner/tickets.md");
      let ticketsMd = await safeReadFile(ticketsDataPath, "");
      if (!ticketsMd.trim()) ticketsMd = await safeReadFile(ticketsPlannerPath, "");
      ticketsCount = parseTicketsMd(ticketsMd).length;
    }

    const body: DashboardMetricsResponse = {
      tickets_count: ticketsCount,
      prompts_count: prompts.length,
      designs_count: designs.length,
      active_projects_count: projects.length,
      all_projects_count: projects.length,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard metrics";
    console.error("dashboard-metrics error:", message, e);
    return NextResponse.json(
      {
        tickets_count: 0,
        prompts_count: 0,
        designs_count: 0,
        active_projects_count: 0,
        all_projects_count: 0,
        error: message,
      },
      { status: 200 }
    );
  }
}
