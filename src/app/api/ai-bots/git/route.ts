import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/git?sessionId=...&botPath=...
 * Get git log and tags.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");

    if (!sessionId || !botPath) {
      return NextResponse.json({ error: "sessionId and botPath are required" }, { status: 400 });
    }

    // Get recent commits
    let { stdout: logText } = await executeCommand(
      sessionId,
      `cd "${botPath}" && git log --oneline --format="%h|%s|%an|%ai" -20 2>/dev/null || echo ''`
    );

    const commits: CommitInfo[] = logText
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, date] = line.split("|");
        return { hash, message, author, date };
      });

    // Get recent tags
    let { stdout: tagsText } = await executeCommand(
      sessionId,
      `cd "${botPath}" && git tag --sort=-v:refname -l "v*" 2>/dev/null | head -5 || echo ''`
    );

    const tags = tagsText.split("\n").filter(Boolean);

    // Get current version from package.json
    let { stdout: pkgText } = await executeCommand(
      sessionId,
      `cd "${botPath}" && cat package.json 2>/dev/null || echo '{}'`
    );

    let version = "unknown";
    try {
      const pkg = JSON.parse(pkgText);
      version = pkg.version || "unknown";
    } catch {
      // ignore
    }

    return NextResponse.json({ commits, tags, currentVersion: version });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get git info" }, { status: 500 });
  }
}

/**
 * POST /api/ai-bots/git
 * Rollback to a specific commit or tag.
 */
export async function POST(request: Request) {
  try {
    const { sessionId, botPath, ref } = await request.json();

    if (!sessionId || !botPath || !ref) {
      return NextResponse.json({ error: "sessionId, botPath, and ref are required" }, { status: 400 });
    }

    // Checkout ref (tag or commit)
    const { stdout, stderr } = await executeCommand(sessionId, `cd "${botPath}" && git checkout "${ref}" 2>&1`);

    return NextResponse.json({ success: true, stdout, stderr });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to checkout ref" }, { status: 500 });
  }
}
