import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

export const dynamic = "force-dynamic";

const CRON_GEN_PROMPT_FILE = "/tmp/kwcode-cron-gen-prompt.txt";

/**
 * POST /api/server/cron/generate
 * Body: { message: string, sessionId: string }
 * Runs Cursor CLI (agent or cursor-agent) on the server to generate a cron suggestion from the user description.
 * No OPENAI_API_KEY required.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId } = body as { message?: string; sessionId?: string };
    const text = typeof message === "string" ? message.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const systemPrompt = `You are a cron job assistant. You must respond with exactly one JSON object and nothing else. No explanation, no markdown, no code fence, no text before or after.
Output format (only this JSON, no other characters):
{"schedule":"<cron expr>","type":"agent or command","prompt":"<if agent>","command":"<if command>","description":"<one line>"}
Cron examples: "0 2 * * *" daily 2am, "0 * * * *" hourly, "*/15 * * * *" every 15 min.
Keys: schedule (cron expression), type ("agent" or "command"), prompt (only if type is agent: short task for Cursor CLI), command (only if type is command: shell command), description (one-line summary).
If the user wants an agent job, set type to "agent" and fill prompt. If they want a plain command, set type to "command" and fill command. Output only the single JSON object.`;

    const fullPrompt = `${systemPrompt}\n\nUser request: ${text}`;
    const b64 = Buffer.from(fullPrompt, "utf8").toString("base64");

    const script = `
echo '${b64}' | base64 -d > ${CRON_GEN_PROMPT_FILE} 2>/dev/null
PROMPT=$(cat ${CRON_GEN_PROMPT_FILE})
if command -v cursor >/dev/null 2>&1; then
  cursor --trust -p "$PROMPT" 2>/dev/null
elif command -v agent >/dev/null 2>&1; then
  agent --trust -p "$PROMPT" 2>/dev/null
elif command -v cursor-agent >/dev/null 2>&1; then
  cursor-agent --trust -p "$PROMPT" 2>/dev/null
else
  CURSOR_CLI=$(find /root/.cursor-server "$HOME/.cursor-server" 2>/dev/null -name cursor -path '*/remote-cli/*' -type f 2>/dev/null | head -1)
  if [ -n "$CURSOR_CLI" ] && [ -x "$CURSOR_CLI" ]; then
    "$CURSOR_CLI" --trust -p "$PROMPT" 2>/dev/null
  else
    echo '{"error":"cursor, agent, or cursor-agent not found. Add cursor to PATH or install Cursor CLI."}'
  fi
fi
`;
    const { stdout, stderr } = await executeCommand(sessionId, script);
    const raw = (stdout + (stderr ? "\n" + stderr : "")).trim();

    function extractJson(str: string): string | null {
      const s = str.trim();
      const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) {
        const inner = codeBlock[1].trim();
        if (inner.startsWith("{")) return inner;
      }
      const firstBrace = s.indexOf("{");
      if (firstBrace === -1) return null;
      let depth = 0;
      for (let i = firstBrace; i < s.length; i++) {
        if (s[i] === "{") depth++;
        else if (s[i] === "}") {
          depth--;
          if (depth === 0) return s.slice(firstBrace, i + 1);
        }
      }
      return null;
    }

    const jsonStr = extractJson(raw);
    if (!jsonStr) {
      return NextResponse.json(
        {
          suggestion: null,
          instruction:
            "Cursor CLI did not return valid JSON. Add cron jobs manually using the form above.",
        },
        { status: 200 }
      );
    }

    let parsed: { schedule?: string; type?: "agent" | "command"; prompt?: string; command?: string; description?: string; error?: string };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      return NextResponse.json(
        {
          suggestion: null,
          instruction: "Could not parse Cursor CLI response as JSON. Add cron jobs manually using the form above.",
        },
        { status: 200 }
      );
    }

    if (parsed.error) {
      return NextResponse.json(
        {
          suggestion: null,
          instruction: parsed.error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      suggestion: {
        schedule: parsed.schedule || "0 * * * *",
        type: parsed.type === "command" ? "command" : "agent",
        prompt: parsed.prompt || "",
        command: parsed.command || "",
        description: parsed.description || "",
      },
      instruction: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate suggestion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
