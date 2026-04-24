/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import { buildUntrustedInputSection, safeJsonParseWithContract } from "@/lib/prompt-contracts";

export const dynamic = "force-static";

/** Ticket shape returned by AI for .cursor/7. planner/tickets.md (see .cursor/tickets-format.md). */
type GeneratedTicket = {
  title: string;
  description?: string;
  priority: "P0" | "P1" | "P2" | "P3";
  featureName: string;
};

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

function isValidPriority(s: string): s is "P0" | "P1" | "P2" | "P3" {
  return PRIORITIES.includes(s as (typeof PRIORITIES)[number]);
}

export async function POST(request: NextRequest) {
  let body: { prompt: string; existingFeatures?: string[]; projectPath?: string; promptOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "Missing or empty prompt" },
      { status: 400 }
    );
  }

  const existingFeatures = Array.isArray(body.existingFeatures)
    ? body.existingFeatures.filter((f) => typeof f === "string")
    : [];
  const promptOnly = body.promptOnly === true;

  const systemPrompt = `You are a product assistant that turns a short user request into a single work item (ticket) for a development backlog.

Output only a single JSON object with exactly these keys (no markdown, no code fence):
- "title": Short, actionable ticket title (e.g. "Add settings page", "Implement login form"). Max ~80 chars.
- "description": Optional 1–3 sentence description clarifying scope or acceptance criteria. Omit key if not needed.
- "priority": One of "P0", "P1", "P2", "P3". P0 = critical/foundation, P1 = high, P2 = medium, P3 = lower/later. Default to P1 if unclear.
- "featureName": A feature or area this ticket belongs to (e.g. "Settings", "Authentication", "Uncategorized"). Use a sensible grouping.`;

  const featuresBlock = buildUntrustedInputSection("EXISTING_FEATURES", existingFeatures.join(", "));
  const requestBlock = buildUntrustedInputSection("USER_REQUEST", prompt);
  const userContent =
    existingFeatures.length > 0
      ? `Existing feature names in this project (prefer reusing one if it fits):\n${featuresBlock}\n\nUser request:\n${requestBlock}`
      : `User request:\n${requestBlock}`;

  const combinedPrompt = [systemPrompt, "", userContent].join("\n");
  const cwd = typeof body.projectPath === "string" && body.projectPath.trim()
    ? path.resolve(body.projectPath.trim())
    : path.resolve(process.cwd());

  if (promptOnly) {
    return NextResponse.json({ prompt: combinedPrompt });
  }

  try {
    let parsed: Record<string, unknown> = {};
    let parsedOk = false;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const strictSuffix = attempt === 0 ? "" : "\n\nIMPORTANT: Return strict JSON object only.";
      lastRaw = await runAgentPrompt(cwd, combinedPrompt + strictSuffix);
      const parsedResult = safeJsonParseWithContract(lastRaw, "object");
      if (parsedResult.ok) {
        parsed = parsedResult.data as Record<string, unknown>;
        parsedOk = true;
        break;
      }
    }
    if (!parsedOk) {
      return NextResponse.json(
        { error: "Model did not return strict JSON object", raw: lastRaw },
        { status: 502 }
      );
    }

    const title = String(parsed.title ?? prompt.slice(0, 80)).trim().slice(0, 200);
    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 2000)
        : undefined;
    const rawPriority = String(parsed.priority ?? "P1");
    const priority = isValidPriority(rawPriority) ? rawPriority : "P1";
    const featureName = String(parsed.featureName ?? "Uncategorized").trim().slice(0, 100);

    const result: GeneratedTicket = {
      title,
      ...(description && { description }),
      priority,
      featureName,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }
}
