import { describe, it, expect } from "vitest";
import {
  mergeRuleStarters,
  mergeSkillStarters,
  mergeMcpStarters,
  mergeAgentStarters,
  RULE_STARTER_CATEGORIES,
  SKILL_STARTER_NAMES,
} from "../setup-entity-starters";

const now = "2026-01-01T00:00:00.000Z";

describe("mergeRuleStarters", () => {
  it("adds one starter per category when rules are empty", () => {
    const merged = mergeRuleStarters([], now);
    expect(merged).toHaveLength(RULE_STARTER_CATEGORIES.length);
    const cats = new Set(merged.map((r) => (r.category ?? "").toLowerCase()));
    for (const c of RULE_STARTER_CATEGORIES) {
      expect(cats.has(c)).toBe(true);
    }
  });

  it("does not duplicate when architecture rule already exists", () => {
    const existing = [
      {
        id: "custom-1",
        name: "Existing",
        description: "d",
        content: "{}",
        category: "architecture",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const merged = mergeRuleStarters(existing, now);
    expect(merged.filter((r) => r.category?.toLowerCase() === "architecture")).toHaveLength(1);
    expect(merged.length).toBe(existing.length + (RULE_STARTER_CATEGORIES.length - 1));
  });

  it("is idempotent when all categories present", () => {
    const full = mergeRuleStarters([], now);
    const again = mergeRuleStarters(full, now);
    expect(again).toHaveLength(full.length);
  });
});

describe("mergeSkillStarters", () => {
  it("adds default skills when empty", () => {
    const merged = mergeSkillStarters([], now);
    expect(merged).toHaveLength(SKILL_STARTER_NAMES.length);
  });

  it("skips skill names that already exist", () => {
    const merged = mergeSkillStarters(
      [
        {
          id: "x",
          name: SKILL_STARTER_NAMES[0],
          description: "",
          content: "",
          createdAt: now,
          updatedAt: now,
        },
      ],
      now
    );
    expect(merged).toHaveLength(SKILL_STARTER_NAMES.length);
  });
});

describe("mergeMcpStarters", () => {
  it("adds a template MCP row when empty", () => {
    const merged = mergeMcpStarters([], now);
    expect(merged).toHaveLength(1);
  });

  it("does nothing when MCP rows already exist", () => {
    const one = [{ id: "a", name: "x", description: "", content: "{}", createdAt: now, updatedAt: now }];
    expect(mergeMcpStarters(one, now)).toEqual(one);
  });
});

describe("mergeAgentStarters", () => {
  it("adds a default agent when empty", () => {
    const merged = mergeAgentStarters([], now);
    expect(merged).toHaveLength(1);
    expect(merged[0].name.length).toBeGreaterThan(0);
  });

  it("does nothing when agents already exist", () => {
    const one = [{ id: "a", name: "x", description: "", content: "y", createdAt: now, updatedAt: now }];
    expect(mergeAgentStarters(one, now)).toEqual(one);
  });
});
