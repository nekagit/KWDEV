/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import { buildUntrustedInputSection, safeJsonParseWithContract } from "@/lib/prompt-contracts";

export const dynamic = "force-static";

const CATEGORIES = [
  "ddd", "tdd", "bdd", "dry", "solid", "kiss", "yagni",
  "clean", "hexagonal", "cqrs", "event_sourcing", "microservices",
  "rest", "graphql", "scenario",
] as const;

export async function POST(request: NextRequest) {
  let body: { topic?: string; count?: number; promptOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const count = typeof body.count === "number" && body.count >= 1 && body.count <= 5
    ? body.count
    : 3;
  const promptOnly = body.promptOnly === true;
  const topicBlock = buildUntrustedInputSection("TOPIC", topic);

  if (!topic) {
    return NextResponse.json(
      { error: "topic is required" },
      { status: 400 }
    );
  }

  const prompt = `You output only a JSON array of objects with keys "name", "description", "category", "practices", "scenarios". Category must be one of: ${CATEGORIES.join(", ")}. No other text, no markdown.

Generate ${count} short architecture or best-practice definitions for software projects based on the topic payload below.

For each definition respond with a JSON array of objects. Each object must have:
- "name": short name (e.g. "Domain-Driven Design (DDD)")
- "description": one or two sentences describing the approach
- "category": one of: ${CATEGORIES.join(", ")}
- "practices": bullet points or short paragraphs for best practices / principles (plain text, newlines ok)
- "scenarios": when to use / specific scenarios (plain text, newlines ok)

Output only a single JSON array, no markdown, no other text. Example format:
[{"name":"...","description":"...","category":"ddd","practices":"- Point one\\n- Point two","scenarios":"When to use..."},...]

${topicBlock}`;

  if (promptOnly) {
    return NextResponse.json({ prompt });
  }

  const cwd = path.resolve(process.cwd());
  try {
    let parsed: { name?: string; description?: string; category?: string; practices?: string; scenarios?: string }[] = [];
    let parsedOk = false;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const strictSuffix = attempt === 0 ? "" : "\n\nIMPORTANT: Return strict JSON array only.";
      lastRaw = await runAgentPrompt(cwd, prompt + strictSuffix);
      const parsedResult = safeJsonParseWithContract(lastRaw, "array");
      if (parsedResult.ok) {
        parsed = parsedResult.data as { name?: string; description?: string; category?: string; practices?: string; scenarios?: string }[];
        parsedOk = true;
        break;
      }
    }
    if (!parsedOk) {
      return NextResponse.json(
        { error: "Model did not return strict JSON array", raw: lastRaw },
        { status: 502 }
      );
    }

    const architectures = (Array.isArray(parsed) ? parsed : []).slice(0, count).map((item) => ({
      name: String(item.name ?? "Untitled").slice(0, 200),
      description: String(item.description ?? "").slice(0, 800),
      category: CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])
        ? item.category
        : "scenario",
      practices: String(item.practices ?? "").slice(0, 2000),
      scenarios: String(item.scenarios ?? "").slice(0, 2000),
    }));

    return NextResponse.json({ architectures });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }
}
