/**
 * Unit tests for API validation schemas and parseAndValidate.
 */
import { describe, it, expect } from "vitest";
import {
  generatePromptRecordSchema,
  generateIdeasSchema,
  createProjectSchema,
  parseAndValidate,
} from "../api-validation";

describe("generatePromptRecordSchema", () => {
  it("accepts valid body with description", () => {
    const result = generatePromptRecordSchema.safeParse({ description: "Do something" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Do something");
      expect(result.data.promptOnly).toBeUndefined();
    }
  });

  it("accepts promptOnly optional", () => {
    const result = generatePromptRecordSchema.safeParse({
      description: "Prompt",
      promptOnly: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.promptOnly).toBe(true);
  });

  it("rejects empty description", () => {
    const result = generatePromptRecordSchema.safeParse({ description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = generatePromptRecordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("generateIdeasSchema", () => {
  it("accepts valid topic with defaults", () => {
    const result = generateIdeasSchema.safeParse({ topic: "AI tools" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("AI tools");
      expect(result.data.count).toBe(5);
    }
  });

  it("accepts custom count", () => {
    const result = generateIdeasSchema.safeParse({ topic: "APIs", count: 3 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.count).toBe(3);
  });

  it("rejects empty topic", () => {
    const result = generateIdeasSchema.safeParse({ topic: "" });
    expect(result.success).toBe(false);
  });

  it("rejects count out of range", () => {
    expect(generateIdeasSchema.safeParse({ topic: "x", count: 0 }).success).toBe(false);
    expect(generateIdeasSchema.safeParse({ topic: "x", count: 11 }).success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts minimal valid project (name only)", () => {
    const result = createProjectSchema.safeParse({ name: "My Project" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Project");
      expect(result.data.promptIds).toEqual([]);
    }
  });

  it("accepts full optional fields", () => {
    const result = createProjectSchema.safeParse({
      name: "Proj",
      description: "Desc",
      repoPath: "/path",
      runPort: 4000,
      promptIds: [1],
      ticketIds: ["t1"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.runPort).toBe(4000);
      expect(result.data.promptIds).toEqual([1]);
    }
  });

  it("rejects empty name", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects runPort out of range", () => {
    expect(createProjectSchema.safeParse({ name: "x", runPort: 0 }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "x", runPort: 70000 }).success).toBe(false);
  });
});

describe("parseAndValidate", () => {
  it("returns success and data when body is valid JSON and passes schema", async () => {
    const body = { description: "Valid" };
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const out = await parseAndValidate(req, generatePromptRecordSchema);
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.description).toBe("Valid");
    }
  });

  it("returns failure with 400 when body is invalid JSON", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: "not json {",
      headers: { "Content-Type": "application/json" },
    });
    const out = await parseAndValidate(req, generatePromptRecordSchema);
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.response.status).toBe(400);
      const json = await out.response.json() as { error?: string };
      expect(json.error).toBe("Invalid JSON body");
    }
  });

  it("returns failure with 400 when JSON is valid but fails schema", async () => {
    const req = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ description: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const out = await parseAndValidate(req, generatePromptRecordSchema);
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.response.status).toBe(400);
      const json = await out.response.json() as { error?: string };
      expect(json.error).toContain("description");
    }
  });
});
