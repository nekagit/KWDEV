import { NextResponse } from "next/server";
import { getPrompts } from "@/lib/data/prompts";
import fs from "node:fs/promises";
import path from "node:path";
import { INLINE_PROMPT_SOURCES } from "@/lib/prompt-sources-inline";

export const dynamic = "force-static";

type PromptFileRecord = {
  id: string;
  title: string;
  category: string;
  content: string;
  sourcePath: string;
  sourceType: "data/prompts";
};

async function listPromptFiles(baseDir: string, relativeDir = ""): Promise<PromptFileRecord[]> {
  const absoluteDir = path.join(baseDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const results: PromptFileRecord[] = [];

  for (const entry of entries) {
    const nextRelativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listPromptFiles(baseDir, nextRelativePath);
      results.push(...nested);
      continue;
    }
    const isPromptFile = entry.name.endsWith(".prompt.md") || entry.name.endsWith(".prompt.json");
    if (!isPromptFile) continue;
    const filePath = path.join(baseDir, nextRelativePath);
    const content = await fs.readFile(filePath, "utf8");
    results.push({
      id: `prompt-file-${nextRelativePath}`,
      title: nextRelativePath,
      category: "data/prompts",
      content,
      sourcePath: `data/prompts/${nextRelativePath}`,
      sourceType: "data/prompts",
    });
  }

  return results;
}

export async function GET() {
  try {
    const dbPrompts = getPrompts().map(p => ({
      id: "db-" + p.id,
      title: p.title,
      content: p.content,
      category: p.category || "Database",
    }));

    const promptDir = path.join(process.cwd(), "data/prompts");
    const dataPrompts = await listPromptFiles(promptDir);

    const inlinePrompts = INLINE_PROMPT_SOURCES.map((p) => ({
      id: `inline-${p.id}`,
      title: p.title,
      content: p.content,
      category: p.category,
      sourcePath: p.sourcePath,
      sourceType: "inline" as const,
    }));

    const dbPromptRecords = dbPrompts.map((p) => ({
      ...p,
      sourcePath: "database/prompts",
      sourceType: "database" as const,
    }));

    return NextResponse.json([...dbPromptRecords, ...dataPrompts, ...inlinePrompts]);
  } catch (e) {
    console.error("All Prompts GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load all prompts" },
      { status: 500 }
    );
  }
}
