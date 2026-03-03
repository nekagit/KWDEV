/** route component. */
import { NextRequest, NextResponse } from "next/server";
import { getPromptById, deletePrompt } from "@/lib/data/prompts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ id: "1" }];
}

/** GET: single prompt by id (numeric, passed as URL segment) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid prompt id" }, { status: 400 });
    }
    const record = getPromptById(numId);
    if (!record) {
      return NextResponse.json({ error: "PromptRecord not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (e) {
    console.error("PromptRecord GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load prompt" },
      { status: 500 }
    );
  }
}

/** DELETE: remove prompt */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId)) {
      return NextResponse.json({ error: "Invalid prompt id" }, { status: 400 });
    }
    const deleted = deletePrompt(numId);
    if (!deleted) {
      return NextResponse.json({ error: "PromptRecord not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PromptRecord DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
