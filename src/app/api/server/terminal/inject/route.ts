import { NextResponse } from "next/server";
import { getInteractiveShell } from "@/lib/server-ssh";

const AGENT_PROMPT_FILE = "/tmp/kwcode-agent-prompt.txt";

/** Inject depends on request body (sessionId) and live shell; must be dynamic. */
export const dynamic = "force-dynamic";

/**
 * For agent prompts we pass content via a temp file so the shell never interprets
 * the prompt (avoids newlines/special chars being executed as commands). We
 * base64-encode so the single-line command is safe; base64 uses A-Za-z0-9+/=
 * (no single quotes). Decode on server and run agent -p "$(cat ...)".
 */
function buildAgentInjectCommand(prompt: string): string {
    const b64 = Buffer.from(prompt, "utf8").toString("base64");
    // Single-quoted b64 is safe (no ' in base64). One line so shell never runs prompt as code.
    return `echo '${b64}' | base64 -d > ${AGENT_PROMPT_FILE} && (command -v agent >/dev/null 2>&1 && agent --trust -p "$(cat ${AGENT_PROMPT_FILE})" || cursor-agent --trust -p "$(cat ${AGENT_PROMPT_FILE})")\n`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sessionId, type, prompt, command } = body as {
            sessionId?: string;
            type?: "agent" | "command";
            prompt?: string;
            command?: string;
        };

        if (!sessionId || !type) {
            return NextResponse.json(
                { error: "sessionId and type (agent | command) are required" },
                { status: 400 }
            );
        }

        const shell = await getInteractiveShell(sessionId);

        if (type === "agent") {
            const trimmed = typeof prompt === "string" ? prompt.trim() : "";
            if (!trimmed) {
                return NextResponse.json({ error: "prompt is required for type agent" }, { status: 400 });
            }
            const toWrite = buildAgentInjectCommand(trimmed);
            shell.write(toWrite);
            return NextResponse.json({ success: true });
        }

        if (type === "command") {
            const raw = typeof command === "string" ? command.trim() : "";
            if (!raw) {
                return NextResponse.json({ error: "command is required for type command" }, { status: 400 });
            }
            if (/\n|\r/.test(raw)) {
                return NextResponse.json(
                    { error: "command must be a single line (no newlines)" },
                    { status: 400 }
                );
            }
            shell.write(raw + "\n");
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "type must be agent or command" }, { status: 400 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terminal inject failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
