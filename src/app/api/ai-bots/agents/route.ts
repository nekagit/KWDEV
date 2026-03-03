import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

interface Agent {
  name: string;
  path: string;
  hasSkill: boolean;
  hasMemory: boolean;
  hasJobs: boolean;
  hasStates: boolean;
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/agents?sessionId=...&basePath=/var/www/ai
 * List subdirectories in basePath as agents. Also lists subdirs of basePath/skills/
 * so agents like agents/basic/skills/agent-playground (with SKILL.md) are discovered.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const basePath = searchParams.get("basePath") || "/var/www/ai";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    /** Folders to never show as agent tabs (not part of zeroclaw core). */
    const IGNORED_DIRS = ["node_modules", ".git"];

    const collectAgents = async (dirPath: string): Promise<{ name: string; path: string }[]> => {
      const cmd = `ls -la "${dirPath}" 2>/dev/null | grep '^d' | awk '{print $NF}' | grep -v '^\\.'`;
      const { stdout } = await executeCommand(sessionId, cmd);
      return stdout
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name && name !== "." && name !== ".." && !IGNORED_DIRS.includes(name))
        .map((name) => ({ name, path: `${dirPath}/${name}` }));
    };

    // 1) Top-level agents: direct children of basePath
    const topLevel = await collectAgents(basePath);

    // 2) Agents under basePath/skills/ (e.g. basic/skills/agent-playground with SKILL.md)
    const skillsPath = `${basePath}/skills`;
    const { stdout: skillsDirExists } = await executeCommand(
      sessionId,
      `test -d "${skillsPath}" && echo "yes" || echo ""`
    );
    const skillsSubdirs =
      skillsDirExists.trim() === "yes" ? await collectAgents(skillsPath) : [];

    const allCandidates = [...topLevel, ...skillsSubdirs];

    // For each agent, check zeroclaw-relevant features: skill, memory, cron/jobs, states
    const agents: Agent[] = [];
    for (const { name, path: agentPath } of allCandidates) {
      const [skillResult, memoryResult, jobsResult, statesResult] = await Promise.all([
        executeCommand(sessionId, `test -f "${agentPath}/skill.md" -o -f "${agentPath}/SKILL.md" -o -f "${agentPath}/skills.md" && echo "true" || echo "false"`),
        executeCommand(sessionId, `test -d "${agentPath}/memory" && echo "true" || echo "false"`),
        executeCommand(sessionId, `test -f "${agentPath}/cron/jobs.db" && echo "true" || echo "false"`),
        executeCommand(sessionId, `test -d "${agentPath}/states" -o -d "${agentPath}/state" -o -f "${agentPath}/state" -o -f "${agentPath}/state.json" && echo "true" || echo "false"`),
      ]);

      const hasSkill = skillResult.stdout.trim() === "true";
      const hasMemory = memoryResult.stdout.trim() === "true";
      const hasJobs = jobsResult.stdout.trim() === "true";
      const hasStates = statesResult.stdout.trim() === "true";

      agents.push({
        name,
        path: agentPath,
        hasSkill,
        hasMemory,
        hasJobs,
        hasStates,
      });
    }

    return NextResponse.json({ agents });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list agents" },
      { status: 500 }
    );
  }
}
