import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * POST /api/ai-bots/agents/create?sessionId=...&agentName=...&templatePath=...
 * Create a new agent by copying a template agent folder
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const agentName = searchParams.get("agentName");
    const templatePath = searchParams.get("templatePath") || "/var/www/ai/zero";
    const basePath = searchParams.get("basePath") || "/var/www/ai";

    if (!sessionId || !agentName) {
      return NextResponse.json(
        { error: "sessionId and agentName are required" },
        { status: 400 }
      );
    }

    // Validate agent name: alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(agentName)) {
      return NextResponse.json(
        { error: "Agent name must contain only alphanumeric characters, hyphens, and underscores" },
        { status: 400 }
      );
    }

    // Check if template exists
    const checkTemplateCmd = `test -d "${templatePath}" && echo "exists" || echo "not_found"`;
    const checkResult = await executeCommand(sessionId, checkTemplateCmd);
    if (checkResult.stdout.trim() === "not_found") {
      return NextResponse.json(
        { error: `Template path does not exist: ${templatePath}` },
        { status: 404 }
      );
    }

    // Check if agent already exists
    const newAgentPath = `${basePath}/${agentName}`;
    const checkExistsCmd = `test -d "${newAgentPath}" && echo "exists" || echo "not_found"`;
    const existsResult = await executeCommand(sessionId, checkExistsCmd);
    if (existsResult.stdout.trim() === "exists") {
      return NextResponse.json(
        { error: `Agent '${agentName}' already exists` },
        { status: 409 }
      );
    }

    // Copy template to new agent
    const copyCmd = `cp -r "${templatePath}" "${newAgentPath}" && echo "success"`;
    const copyResult = await executeCommand(sessionId, copyCmd);

    if (copyResult.stdout.trim() !== "success") {
      throw new Error("Failed to copy template");
    }

    // Get info about the newly created agent
    const [skillCheck, memoryCheck, jobsCheck, statesCheck] = await Promise.all([
      executeCommand(sessionId, `test -f "${newAgentPath}/skill.md" -o -f "${newAgentPath}/SKILL.md" -o -f "${newAgentPath}/skills.md" && echo "1" || echo "0"`),
      executeCommand(sessionId, `test -d "${newAgentPath}/memory" && echo "1" || echo "0"`),
      executeCommand(sessionId, `test -f "${newAgentPath}/cron/jobs.db" && echo "1" || echo "0"`),
      executeCommand(sessionId, `test -d "${newAgentPath}/states" -o -d "${newAgentPath}/state" -o -f "${newAgentPath}/state" -o -f "${newAgentPath}/state.json" && echo "1" || echo "0"`),
    ]);

    const newAgent = {
      name: agentName,
      path: newAgentPath,
      hasSkill: skillCheck.stdout.trim() === "1",
      hasMemory: memoryCheck.stdout.trim() === "1",
      hasJobs: jobsCheck.stdout.trim() === "1",
      hasStates: statesCheck.stdout.trim() === "1",
    };

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
