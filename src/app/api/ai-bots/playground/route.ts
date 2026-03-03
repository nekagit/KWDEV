import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parseDotEnv } from "@/lib/zeroclaw-parser";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * Context prepended when running a task via the agent fallback (no /chat). Tells the agent it
 * has browser automation and must use it instead of refusing (e.g. for form filling, login).
 */
const BROWSER_AUTOMATION_CONTEXT = `You are the zeroclaw browser-automation bot. You HAVE the ability to automate a browser: use Puppeteer, Playwright, Selenium, or zeroclaw's built-in browser tool. You MUST use these tools to complete the user's task. Do not refuse by saying you cannot open sites or fill forms—you can. Use credentials from environment variables (e.g. INSTAGRAM_USER, INSTAGRAM_PASSWORD) when the user refers to an account name or password; if they pasted credentials in the message, use env vars instead and remind them to set secrets in the Env tab. Now complete this task:

`;

/**
 * POST /api/ai-bots/playground
 * Send a message to the bot and get a response.
 * 1) Tries HTTP POST to the bot's /chat endpoint (BOT_PORT in .env).
 * 2) If that returns an HTML error (e.g. "Cannot POST /chat") or no JSON, runs the message as a
 *    one-off agent prompt on the server (cursor/agent with --trust --sandbox disabled --force),
 *    with a prepended context that instructs the agent to use browser automation and not refuse.
 *    Same as Cron "Run now" for prompt-based jobs. Returns stdout as the response.
 */
export async function POST(request: Request) {
  try {
    const { sessionId, botPath, message, overrides } = await request.json();

    if (!sessionId || !botPath || !message) {
      return NextResponse.json({ error: "sessionId, botPath, and message are required" }, { status: 400 });
    }

    const msg = String(message).trim();
    const escapedPath = botPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const basePath =
      botPath.includes("/agents/") || botPath.includes("/agent/")
        ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
        : "/var/www/ai";
    const safeBase = basePath.replace(/'/g, "'\"'\"'");
    const safeBot = botPath.replace(/'/g, "'\"'\"'");

    // 1) Try HTTP /chat
    let botResponse: { response?: string; tokens?: number; latency?: number; chunks?: unknown[]; debug?: string } = {
      response: "",
      tokens: 0,
      latency: 0,
      chunks: [],
      debug: "",
    };

    try {
      const { stdout: envText } = await executeCommand(sessionId, `cat "${safeBot}/.env" 2>/dev/null || echo ''`);
      const env = parseDotEnv(envText);
      const botPort = env["BOT_PORT"] || env["PORT"] || "3000";
      const botHost = env["BOT_HOST"] || "localhost";
      const payload = { message: msg, ...(overrides || {}) };
      const curlCmd = `curl -s -X POST "http://${botHost}:${botPort}/chat" -H "Content-Type: application/json" -d '${JSON.stringify(payload).replace(/'/g, "'\"'\"'")}'`;
      const { stdout: apiResponse } = await executeCommand(sessionId, curlCmd);
      if (apiResponse.trim()) {
        const isHtmlError =
          apiResponse.trimStart().startsWith("<!") ||
          apiResponse.includes("Cannot POST") ||
          apiResponse.includes("<title>Error</title>");
        if (!isHtmlError) {
          try {
            const parsed = JSON.parse(apiResponse);
            botResponse = parsed;
          } catch {
            botResponse = { response: apiResponse, tokens: 0, latency: 0, chunks: [], debug: "Raw response" };
          }
        }
      }
    } catch {
      // curl failed, will use agent fallback
    }

    const hasValidChatResponse =
      botResponse?.response != null &&
      botResponse.response !== "" &&
      !String(botResponse.response).trimStart().startsWith("<!");

    if (hasValidChatResponse) {
      return NextResponse.json({
        response: botResponse.response || "No response from bot",
        tokens: botResponse.tokens ?? 0,
        latency: botResponse.latency ?? 0,
        ragChunks: botResponse.chunks ?? [],
        model: (overrides as { model?: string })?.model ?? "default",
        temperature: (overrides as { temperature?: number })?.temperature ?? 0.7,
        debug: botResponse.debug ?? "",
      });
    }

    // 2) Fallback: run task as one-off agent prompt on the server (no /chat endpoint).
    // Prepend context so the agent uses browser automation instead of refusing.
    const fullPrompt = BROWSER_AUTOMATION_CONTEXT + msg;
    const b64 = Buffer.from(fullPrompt, "utf8").toString("base64");
    const agentFlags = "--trust --sandbox disabled --force --output-format text";
    const runCmd = `( set -a; [ -f '${safeBase}/.env' ] && . '${safeBase}/.env'; [ -f '${safeBot}/.env' ] && . '${safeBot}/.env'; set +a; TMPF="/tmp/web_task_${Date.now()}_$$.txt"; echo '${b64}' | base64 -d > "$TMPF"; export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"; ( cd "${escapedPath}" 2>/dev/null && ( cursor ${agentFlags} -p "$(cat "$TMPF")" 2>/dev/null || agent ${agentFlags} -p "$(cat "$TMPF")" 2>/dev/null || cursor-agent ${agentFlags} -p "$(cat "$TMPF")" 2>/dev/null ) ); rm -f "$TMPF" )`;
    const { stdout, stderr, exitCode } = await executeCommand(sessionId, runCmd);
    const out = (stdout || "").trim();
    const err = (stderr || "").trim();
    const response = out || (err ? `[stderr]\n${err}` : "No output from agent.");
    const debug =
      exitCode !== 0
        ? `Agent exit code ${exitCode}. Ensure cursor, agent, or cursor-agent is on the server PATH.`
        : "Ran via agent (no /chat endpoint).";

    return NextResponse.json({
      response,
      tokens: 0,
      latency: 0,
      ragChunks: [],
      model: (overrides as { model?: string })?.model ?? "default",
      temperature: (overrides as { temperature?: number })?.temperature ?? 0.7,
      debug,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send message to bot" }, { status: 500 });
  }
}
