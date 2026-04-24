/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { runAgentPrompt } from "@/lib/agent-runner";
import { parseAndValidate, generatePromptRecordSchema } from "@/lib/api-validation";
import { buildUntrustedInputSection, safeJsonParseWithContract } from "@/lib/prompt-contracts";

export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  const parsed = await parseAndValidate(request, generatePromptRecordSchema);
  if (!parsed.success) return parsed.response;
  const { description, promptOnly } = parsed.data;

  const descriptionBlock = buildUntrustedInputSection("DESCRIPTION", description);
  const prompt = `You output only a single JSON object with keys "title" and "content". No other text, no markdown.

Generate a single Cursor/IDE prompt based on this description. The prompt will be used to instruct an AI assistant when working in a codebase.

Description payload:
${descriptionBlock}

Respond with a JSON object with exactly two keys:
- "title": a short title for the prompt (e.g. "Refactor to use TypeScript")
- "content": the full prompt text the user will run (clear instructions, steps, rules). No markdown code fence around the JSON.`;

  if (promptOnly) {
    return NextResponse.json({ prompt });
  }

  const cwd = path.resolve(process.cwd());
  try {
    let parsedJson: { title?: string; content?: string } = {};
    let parsedOk = false;
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const strictSuffix = attempt === 0 ? "" : "\n\nIMPORTANT: Return strict JSON object only.";
      lastRaw = await runAgentPrompt(cwd, prompt + strictSuffix);
      const parsedResult = safeJsonParseWithContract(lastRaw, "object");
      if (parsedResult.ok) {
        parsedJson = parsedResult.data as { title?: string; content?: string };
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

    const title = String(parsedJson.title ?? "Generated prompt").slice(0, 500);
    const content = String(parsedJson.content ?? "").slice(0, 50000);

    return NextResponse.json({ title, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Agent request failed", detail: message },
      { status: 502 }
    );
  }
}
