import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parseDotEnv } from "@/lib/zeroclaw-parser";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/** Serialize env object to .env format (value with space/#/" gets quoted). */
function serializeDotEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .filter(([k]) => k.trim() !== "")
    .map(([k, v]) => {
      const val = (v ?? "").trim();
      if (val.includes(" ") || val.includes("#") || val.includes('"') || val.includes("\n")) {
        return `${k.trim()}="${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      }
      return `${k.trim()}=${val}`;
    })
    .join("\n");
}

/**
 * GET /api/ai-bots/files/read?sessionId=...&botPath=...&file=...
 * Read a single file under botPath. file is relative (e.g. ecosystem.config.js).
 * Validates: no "..", no absolute path.
 * For secrets/.env when botPath is an agent path: merge base path .env with agent secrets (agent overrides).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");
    const file = searchParams.get("file");

    if (!sessionId || !botPath || !file) {
      return NextResponse.json(
        { error: "sessionId, botPath, and file are required" },
        { status: 400 }
      );
    }

    const trimmed = file.trim();
    if (trimmed.startsWith("..") || trimmed.includes("/..") || trimmed.startsWith("/")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Ensure secrets folder exists when reading secrets/.env (Env tab: basic, advanced, premium)
    if (trimmed === "secrets/.env") {
      await executeCommand(sessionId, `mkdir -p "${botPath.replace(/"/g, '\\"')}/secrets"`);
    }

    let content: string;

    // For agent paths: merge AI folder .env with agent secrets/.env so Env tab shows both (agent overrides)
    if (trimmed === "secrets/.env" && (botPath.includes("/agents/") || botPath.includes("/agent/"))) {
      const basePath =
        botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai";
      const escapedBase = basePath.replace(/"/g, '\\"');
      const escapedBot = botPath.replace(/"/g, '\\"');
      const [baseOut, agentOut] = await Promise.all([
        executeCommand(sessionId, `cat "${escapedBase}/.env" 2>/dev/null || echo ''`),
        executeCommand(sessionId, `cat "${escapedBot}/secrets/.env" 2>/dev/null || echo ''`),
      ]);
      const baseEnv = parseDotEnv(baseOut.stdout);
      const agentEnv = parseDotEnv(agentOut.stdout);
      const merged = { ...baseEnv, ...agentEnv };
      content = serializeDotEnv(merged);
    } else {
      const { stdout } = await executeCommand(
        sessionId,
        `cat "${botPath.replace(/"/g, '\\"')}/${trimmed}" 2>/dev/null || echo ''`
      );
      content = stdout;
    }

    // On case-sensitive FS (e.g. Linux), try common skill filename variants
    let resolvedFile: string | undefined = trimmed;

    // If requested file is empty, try variants (SKILL.md is common in Cursor skills)
    if (!content?.trim()) {
      let variants: string[] = [];
      if (trimmed === "skill.md") {
        variants = ["SKILL.md", "skills.md", "Skill.md"];
      } else if (trimmed === "skills.md") {
        variants = ["SKILL.md", "skill.md", "Skill.md", "skills.md", "SKILLS.md"];
      }

      for (const name of variants) {
        const { stdout: alt } = await executeCommand(
          sessionId,
          `cat "${botPath}/${name}" 2>/dev/null || echo ''`
        );
        if (alt?.trim()) {
          content = alt;
          resolvedFile = name;
          break;
        }
      }
    }

    return NextResponse.json({ content, resolvedFile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
