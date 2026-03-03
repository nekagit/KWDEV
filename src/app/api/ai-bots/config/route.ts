import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parseDotEnv } from "@/lib/zeroclaw-parser";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/config?sessionId=...&botPath=...
 * Read and parse bot config files (.env, package.json, zeroclaw.config.js).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");

    if (!sessionId || !botPath) {
      return NextResponse.json({ error: "sessionId and botPath are required" }, { status: 400 });
    }

    const config: Record<string, any> = {};

    // Read .env
    try {
      const { stdout: envText } = await executeCommand(sessionId, `cat "${botPath}/.env" 2>/dev/null || echo ''`);
      if (envText.trim()) {
        config.env = parseDotEnv(envText);
      }
    } catch {
      // ignore
    }

    // Read package.json
    try {
      const { stdout: pkgText } = await executeCommand(sessionId, `cat "${botPath}/package.json" 2>/dev/null || echo '{}'`);
      config.packageJson = JSON.parse(pkgText);
    } catch {
      config.packageJson = {};
    }

    // Read zeroclaw.config.js as text (not evaluated)
    try {
      const { stdout: configText } = await executeCommand(
        sessionId,
        `cat "${botPath}/zeroclaw.config.js" 2>/dev/null || echo ''`
      );
      if (configText.trim()) {
        config.zeroclawConfig = configText;
      }
    } catch {
      // ignore
    }

    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to read config" }, { status: 500 });
  }
}

/**
 * PUT /api/ai-bots/config
 * Write a config file.
 */
export async function PUT(request: Request) {
  try {
    const { sessionId, botPath, file, content } = await request.json();

    if (!sessionId || !botPath || !file || content === undefined) {
      return NextResponse.json({ error: "sessionId, botPath, file, and content are required" }, { status: 400 });
    }

    // Whitelist files to write (include secrets/.env for Env tab: basic, advanced, premium)
    const allowedFiles = [
      ".env",
      "skill.md",
      "SKILL.md",
      "skills.md",
      "skills/agent-playground/SKILL.md",
      "secrets/.env",
    ];
    if (!allowedFiles.includes(file)) {
      return NextResponse.json({ error: `Writing to ${file} is not allowed` }, { status: 403 });
    }

    // Ensure directory exists (botPath and, for nested paths like skills/agent-playground/, the parent dir)
    const dir = file.includes("/") ? `${botPath}/${file.replace(/\/[^/]+$/, "")}` : botPath;
    await executeCommand(sessionId, `mkdir -p "${dir.replace(/"/g, '\\"')}"`);

    // Unique heredoc delimiter so content can contain "EOF" or quotes without breaking
    const delim = "__CONFIG_WRITE_END__";
    const contentStr = typeof content === "string" ? content : "";
    const cmd = `cat > "${botPath}/${file}" << '${delim}'\n${contentStr}\n${delim}`;
    await executeCommand(sessionId, cmd);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err?.message || "Failed to write config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
