/**
 * Parse ticket-shaped JSON from agent stdout (e.g. generate-ticket-from-prompt).
 * Handles markdown code blocks and snake_case (feature_name) from agents.
 */

export type ParsedTicketFromStdout = {
  title?: string;
  description?: string;
  priority?: string;
  featureName?: string;
};

/** Normalize agent JSON to expected shape (accepts snake_case e.g. feature_name). */
export function normalizeTicketParsed(
  parsed: Record<string, unknown>
): ParsedTicketFromStdout {
  return {
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    priority: typeof parsed.priority === "string" ? parsed.priority : undefined,
    featureName:
      typeof (parsed.featureName ?? parsed.feature_name) === "string"
        ? String(parsed.featureName ?? parsed.feature_name)
        : undefined,
  };
}

/** Extract a ticket-shaped JSON object from agent stdout (handles markdown code blocks and extra text). */
export function extractTicketJsonFromStdout(stdout: string): ParsedTicketFromStdout | null {
  let toParse = stdout.trim();
  const codeBlock = toParse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) toParse = codeBlock[1].trim();
  const firstBrace = toParse.indexOf("{");
  if (firstBrace === -1) return null;
  const fromBrace = toParse.slice(firstBrace);
  for (let depth = 0, end = 0; end < fromBrace.length; end++) {
    if (fromBrace[end] === "{") depth++;
    else if (fromBrace[end] === "}") {
      depth--;
      if (depth === 0) {
        try {
          const raw = JSON.parse(fromBrace.slice(0, end + 1)) as Record<string, unknown>;
          if (raw && typeof raw === "object" && !Array.isArray(raw)) return normalizeTicketParsed(raw);
        } catch {
          /* try next closing brace */
        }
      }
    }
  }
  try {
    const fallback = JSON.parse(fromBrace) as Record<string, unknown>;
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) return normalizeTicketParsed(fallback);
  } catch {
    /* ignore */
  }
  return null;
}
