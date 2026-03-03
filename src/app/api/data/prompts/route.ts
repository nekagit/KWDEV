/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { parseAndValidate, createPromptRecordSchema } from "@/lib/api-validation";
import { getPrompts, createOrUpdatePrompt } from "@/lib/data/prompts";

export const dynamic = "force-static";

/** GET: return full prompt list (with content) for edit UI */
export async function GET() {
  try {
    const prompts = getPrompts();
    return NextResponse.json(prompts);
  } catch (e) {
    console.error("PromptRecords GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load prompts" },
      { status: 500 }
    );
  }
}

/** POST: create or update a prompt. Body: { id?: number, title: string, content: string, category?: string }. Writes to DB only. */
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseAndValidate(request, createPromptRecordSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;
    const record = createOrUpdatePrompt({
      id: body.id,
      title: body.title.trim(),
      content: body.content,
      category: body.category ?? null,
    });
    return NextResponse.json(record);
  } catch (e) {
    console.error("PromptRecords POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save prompt" },
      { status: 500 }
    );
  }
}
