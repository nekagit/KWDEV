import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Escape path for safe use inside double-quoted shell string. */
function escapeShellPath(p: string): string {
  return p
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

export const dynamic = "force-dynamic";

export interface Contact {
  id: string;
  name: string;
  number: string;
  email?: string;
  notes?: string;
}

/**
 * GET /api/ai-bots/contacts?sessionId=...&botPath=...
 * Read contacts from botPath/contacts.json.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    const safePath = escapeShellPath(botPath.trim());
    const { stdout } = await executeCommand(
      sessionId,
      `cat "${safePath}/contacts.json" 2>/dev/null || echo '[]'`
    );

    let contacts: Contact[] = [];
    const raw = stdout?.trim();
    if (raw && raw !== "[]") {
      try {
        contacts = JSON.parse(raw) as Contact[];
        if (!Array.isArray(contacts)) contacts = [];
      } catch {
        contacts = [];
      }
    }

    return NextResponse.json({ contacts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/ai-bots/contacts
 * Body: { sessionId, botPath, contacts: Contact[] }
 * Write contacts to botPath/contacts.json (creates directory if needed).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, botPath, contacts } = body as {
      sessionId?: string;
      botPath?: string;
      contacts?: Contact[];
    };

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    const list = Array.isArray(contacts) ? contacts : [];
    const json = JSON.stringify(list, null, 2);
    const base64 = Buffer.from(json, "utf-8").toString("base64");
    const safePath = escapeShellPath(botPath.trim());

    await executeCommand(sessionId, `mkdir -p "${safePath}"`);
    await executeCommand(
      sessionId,
      `echo '${base64}' | base64 -d > "${safePath}/contacts.json"`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
