const PROMPT_JSON_SUFFIX = ".prompt.json";
const PROMPT_MD_SUFFIX = ".prompt.md";

export function extractPromptTextFromJson(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid prompt JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid prompt JSON: expected object payload.");
  }

  const sourceMarkdown = (parsed as { source_markdown?: unknown }).source_markdown;
  if (typeof sourceMarkdown !== "string") {
    throw new Error("Invalid prompt JSON: missing source_markdown.");
  }

  const trimmed = sourceMarkdown.trim();
  if (!trimmed) {
    throw new Error("Invalid prompt JSON: source_markdown is empty.");
  }
  return trimmed;
}

export function getPromptStemFromFileName(fileName: string): string | null {
  if (fileName.endsWith(PROMPT_MD_SUFFIX)) return fileName.slice(0, -PROMPT_MD_SUFFIX.length);
  if (fileName.endsWith(PROMPT_JSON_SUFFIX)) return fileName.slice(0, -PROMPT_JSON_SUFFIX.length);
  return null;
}

export function validatePromptFilePairs(fileNames: string[]): string[] {
  const seen = new Map<string, { hasMd: boolean; hasJson: boolean }>();

  for (const fileName of fileNames) {
    const stem = getPromptStemFromFileName(fileName);
    if (!stem) continue;
    const current = seen.get(stem) ?? { hasMd: false, hasJson: false };
    if (fileName.endsWith(PROMPT_MD_SUFFIX)) current.hasMd = true;
    if (fileName.endsWith(PROMPT_JSON_SUFFIX)) current.hasJson = true;
    seen.set(stem, current);
  }

  const errors: string[] = [];
  for (const [stem, flags] of seen.entries()) {
    if (!flags.hasJson) {
      errors.push(`Missing data/prompts/${stem}.prompt.json (counterpart for ${stem}.prompt.md).`);
    }
    if (!flags.hasMd) {
      errors.push(`Missing data/prompts/${stem}.prompt.md (counterpart for ${stem}.prompt.json).`);
    }
  }
  return errors.sort();
}
