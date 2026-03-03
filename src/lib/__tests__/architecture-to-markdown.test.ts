/**
 * Unit tests for architecture-to-markdown: architecture record to .md export.
 */
import { describe, it, expect } from "vitest";
import { architectureRecordToMarkdown } from "../architecture-to-markdown";
import type { ArchitectureRecord } from "@/types/architecture";

function minimalRecord(overrides: Partial<ArchitectureRecord> = {}): ArchitectureRecord {
  return {
    id: "arch-1",
    name: "Test Architecture",
    category: "ddd",
    description: "A minimal description.",
    practices: "",
    scenarios: "",
    created_at: "2025-01-01",
    updated_at: "2025-01-02",
    ...overrides,
  };
}

describe("architectureRecordToMarkdown", () => {
  it("starts with record name as H1", () => {
    const md = architectureRecordToMarkdown(minimalRecord());
    expect(md).toMatch(/^# Test Architecture\n/);
  });

  it("includes id, category, and dates in metadata", () => {
    const md = architectureRecordToMarkdown(minimalRecord());
    expect(md).toContain("- **ID:** `arch-1`");
    expect(md).toContain("- **Category:** ddd");
    expect(md).toContain("- **Created:** 2025-01-01");
    expect(md).toContain("- **Updated:** 2025-01-02");
  });

  it("omits Created/Updated when missing", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({ created_at: "", updated_at: "" })
    );
    expect(md).not.toContain("**Created:**");
    expect(md).not.toContain("**Updated:**");
  });

  it("includes Description section with record description", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({ description: "My description text." })
    );
    expect(md).toContain("## Description");
    expect(md).toContain("My description text.");
  });

  it("shows placeholder when description is empty", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({ description: "" })
    );
    expect(md).toContain("*No description.*");
  });

  it("includes optional Practices section when present", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({ practices: "Use aggregates and value objects." })
    );
    expect(md).toContain("## Practices / Principles");
    expect(md).toContain("Use aggregates and value objects.");
  });

  it("omits Practices section when empty", () => {
    const md = architectureRecordToMarkdown(minimalRecord());
    expect(md).not.toContain("## Practices / Principles");
  });

  it("includes optional Scenarios section when present", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({ scenarios: "When building domain-heavy apps." })
    );
    expect(md).toContain("## Scenarios / When to use");
    expect(md).toContain("When building domain-heavy apps.");
  });

  it("includes optional References, Anti-patterns, Examples when present", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({
        references: "Book: DDD by Eric Evans",
        anti_patterns: "Anemic domain model.",
        examples: "See repo X.",
      })
    );
    expect(md).toContain("## References");
    expect(md).toContain("Book: DDD by Eric Evans");
    expect(md).toContain("## Anti-patterns");
    expect(md).toContain("Anemic domain model.");
    expect(md).toContain("## Examples");
    expect(md).toContain("See repo X.");
  });

  it("includes Additional inputs section when extra_inputs has entries", () => {
    const md = architectureRecordToMarkdown(
      minimalRecord({
        extra_inputs: { "Key1": "Val1", "Key2": "Val2" },
      })
    );
    expect(md).toContain("## Additional inputs");
    expect(md).toContain("**Key1:** Val1");
    expect(md).toContain("**Key2:** Val2");
  });

  it("omits Additional inputs when extra_inputs is empty or missing", () => {
    const md = architectureRecordToMarkdown(minimalRecord());
    expect(md).not.toContain("## Additional inputs");
    const md2 = architectureRecordToMarkdown(
      minimalRecord({ extra_inputs: {} })
    );
    expect(md2).not.toContain("## Additional inputs");
  });

  it("ends with export footer", () => {
    const md = architectureRecordToMarkdown(minimalRecord());
    expect(md.trimEnd()).toMatch(/\*Exported from Architecture\*$/);
  });

  it("produces deterministic output for same input", () => {
    const record = minimalRecord({
      name: "SOLID",
      category: "solid",
      description: "Five principles.",
      practices: "Single responsibility.",
    });
    expect(architectureRecordToMarkdown(record)).toBe(
      architectureRecordToMarkdown(record)
    );
  });
});
