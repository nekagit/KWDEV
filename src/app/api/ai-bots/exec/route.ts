import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * POST /api/ai-bots/exec
 * Execute arbitrary command via SSH.
 */
export async function POST(request: Request) {
  try {
    const { sessionId, cmd } = await request.json();

    if (!sessionId || !cmd) {
      return NextResponse.json({ error: "sessionId and cmd are required" }, { status: 400 });
    }

    const { stdout, stderr } = await executeCommand(sessionId, cmd);
    return NextResponse.json({ stdout, stderr });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute command" }, { status: 500 });
  }
}
