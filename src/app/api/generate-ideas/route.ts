/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import { parseAndValidate, generateIdeasSchema } from "@/lib/api-validation";

export const dynamic = "force-static";

const CATEGORIES = ["saas", "iaas", "paas", "website", "webapp", "webshop", "other"] as const;

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, generateIdeasSchema);
  if (!parsed.success) return parsed.response;
  const { topic, count, promptOnly } = parsed.data;

  const prompt = `You output only a JSON array of objects with keys "title", "description", "category". Category must be one of: saas, iaas, paas, website, webapp, webshop, other. No other text, no markdown.

Generate ${count} short business/product ideas for the internet or computer space based on this topic or niche: "${topic}"

Types to mix when relevant: SaaS (software as a service), IaaS (infrastructure), PaaS (platform), website, webapp, webshop, or other digital products.

For each idea respond with a JSON array of objects. Each object must have:
- "title": short catchy name (e.g. "API usage dashboard for dev teams")
- "description": one or two sentences describing the idea and who it's for
- "category": one of: saas, iaas, paas, website, webapp, webshop, other

Output only a single JSON array, no markdown, no other text. Example format:
[{"title":"...","description":"...","category":"saas"},...]`;

  if (promptOnly) {
    return NextResponse.json({ prompt });
  }

  const cwd = path.resolve(process.cwd());
  try {
    const raw = await runAgentPrompt(cwd, prompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    let parsedIdeas: { title?: string; description?: string; category?: string }[];
    try {
      parsedIdeas = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON array", raw },
        { status: 502 }
      );
    }

    const ideas = (Array.isArray(parsedIdeas) ? parsedIdeas : []).slice(0, count).map((item) => ({
      title: String(item.title ?? "Untitled").slice(0, 200),
      description: String(item.description ?? "").slice(0, 1000),
      category: CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])
        ? item.category
        : "other",
    }));

    return NextResponse.json({ ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }
}
