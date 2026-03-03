/**
 * Zod schemas and helpers for API request validation.
 * Use parseOr400 to validate request bodies and return 400 on failure.
 */

import { z } from "zod";
import { NextResponse } from "next/server";

export const generatePromptRecordSchema = z.object({
  description: z.string().min(1, "description is required").max(10000),
  promptOnly: z.boolean().optional(),
});

export const generateTicketsOptionsSchema = z.object({
  granularity: z.enum(["epic", "medium", "small"]).optional().default("medium"),
  defaultPriority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  includeAcceptanceCriteria: z.boolean().optional().default(true),
  includeTechnicalNotes: z.boolean().optional().default(false),
  splitByComponent: z.boolean().optional().default(false),
});

export const uploadedFileSchema = z.object({
  name: z.string(),
  label: z.string(),
  contentBase64: z.string(),
  mimeType: z.string().optional().default("application/octet-stream"),
});

export const projectAnalysisSchema = z.object({
  name: z.string(),
  path: z.string(),
  package_json: z.string().optional(),
  readme_snippet: z.string().optional(),
  top_level_dirs: z.array(z.string()).optional().default([]),
  top_level_files: z.array(z.string()).optional().default([]),
  config_snippet: z.string().optional(),
});

export const generateTicketsSchema = z.object({
  description: z.string().optional().default(""),
  options: generateTicketsOptionsSchema.optional(),
  files: z.array(uploadedFileSchema).optional().default([]),
  project_analysis: projectAnalysisSchema.optional(),
});

export const generateIdeasSchema = z.object({
  topic: z.string().min(1, "topic is required").max(2000),
  count: z.number().int().min(1).max(10).optional().default(5),
  promptOnly: z.boolean().optional(),
});

/** Body for improving a raw idea with AI (e.g. for ideas.md). */
export const improveIdeaSchema = z.object({
  rawIdea: z.string().min(1, "rawIdea is required").max(5000),
  projectName: z.string().max(200).optional(),
  promptOnly: z.boolean().optional(),
});

export const generateDesignSchema = z.object({
  description: z.string().min(1, "description is required").max(5000),
  templateId: z.string().max(100).optional().default("landing"),
  projectName: z.string().max(200).optional().default("My Product"),
});

export const generateArchitecturesSchema = z.object({
  description: z.string().optional().default(""),
  category: z.string().optional(),
});

export const generateProjectFromIdeaSchema = z.union([
  z.object({ ideaId: z.number().int().positive() }),
  z.object({
    idea: z.object({
      title: z.string().min(1),
      description: z.string(),
      category: z.string().optional(),
    }),
  }),
]);

export const generatePromptRecordFromKanbanSchema = z.object({
  tickets: z.array(z.object({
    number: z.number(),
    title: z.string(),
    priority: z.string().optional(),
    featureName: z.string().optional(),
    done: z.boolean().optional(),
  })).optional().default([]),
});

export const generateCommitMessageSchema = z.object({
  changes: z.string().min(1, "changes is required").max(50000),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "name is required").max(500),
  description: z.string().optional(),
  repoPath: z.string().optional(),
  runPort: z.number().int().min(1).max(65535).optional(),
  promptIds: z.array(z.number()).optional().default([]),
  ticketIds: z.array(z.string()).optional().default([]),
  ideaIds: z.array(z.number()).optional().default([]),
  designIds: z.array(z.string()).optional().default([]),
  architectureIds: z.array(z.string()).optional().default([]),
});

export const createPromptRecordSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1, "title is required").max(500),
  content: z.string().max(100_000),
  category: z.string().optional(),
});

export const createIdeaSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1, "title is required").max(500),
  description: z.string().max(10000),
  category: z.string().max(200),
  source: z.string().optional(),
});

export const createDesignSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  config: z.record(z.unknown()).optional(),
});

export const createArchitectureSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  category: z.string().max(200).optional(),
  description: z.string().max(10000).optional(),
  practices: z.string().optional(),
  scenarios: z.string().optional(),
  references: z.string().optional(),
  anti_patterns: z.string().optional(),
  examples: z.string().optional(),
  extra_inputs: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  name: z.string().min(1).max(500).optional(),
});

/** Parse JSON body and validate with schema. Returns NextResponse with 400 on failure. */
export async function parseAndValidate<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.errors[0];
    const msg = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
    return {
      success: false,
      response: NextResponse.json({ error: msg, details: result.error.errors }, { status: 400 }),
    };
  }
  return { success: true, data: result.data };
}
