import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai-bots/env/copy-from-base
 * Copy the .env from the AI base folder (e.g. /var/www/ai) into the agent folder
 * as secrets/.env (e.g. /var/www/ai/agents/basic/secrets/.env).
 * Body: { sessionId, botPath }
 */
export async function POST(request: Request) {
  try {
    const { sessionId, botPath } = await request.json() as { sessionId?: string; botPath?: string };

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    const isAgentPath = botPath.includes("/agents/") || botPath.includes("/agent/");
    const basePath = isAgentPath
      ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
      : null;

    if (!basePath || basePath === botPath) {
      return NextResponse.json(
        { error: "botPath must be an agent path (e.g. /var/www/ai/agents/basic)" },
        { status: 400 }
      );
    }

    const escapedBase = basePath.replace(/'/g, "'\"'\"'").replace(/"/g, '\\"');
    const escapedBot = botPath.replace(/'/g, "'\"'\"'").replace(/"/g, '\\"');

    const { stdout: existsOut } = await executeCommand(
      sessionId,
      `[ -f "${escapedBase}/.env" ] && echo yes || echo ''`
    );
    if (existsOut.trim() !== "yes") {
      return NextResponse.json(
        { error: `No .env found at ${basePath}/.env` },
        { status: 404 }
      );
    }

    await executeCommand(sessionId, `mkdir -p "${escapedBot}/secrets"`);
    const { stderr, exitCode } = await executeCommand(
      sessionId,
      `cat "${escapedBase}/.env" > "${escapedBot}/secrets/.env"`
    );

    if (exitCode !== 0) {
      return NextResponse.json(
        { error: stderr?.trim() || "Copy failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Copied ${basePath}/.env to ${botPath}/secrets/.env`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to copy .env";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
