import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("setup entities db storage", () => {
  it("extends project doc/config type unions for setup entities", () => {
    const apiProjectsPath = path.join(process.cwd(), "src/lib/api-projects.ts");
    const source = fs.readFileSync(apiProjectsPath, "utf8");

    expect(source).toContain('"setup_prompts"');
    expect(source).toContain('"setup_skills"');
    expect(source).toContain('"setup_rules"');
    expect(source).toContain('"setup_agents"');
    expect(source).toContain('"setup_mcp_servers"');
    expect(source).toContain('"setup_migrations"');
  });

  it("allows setup doc/config types in tauri docs/configs backend", () => {
    const docsConfigsPath = path.join(process.cwd(), "src-tauri/src/db/docs_configs.rs");
    const source = fs.readFileSync(docsConfigsPath, "utf8");

    expect(source).toContain('"setup_prompts"');
    expect(source).toContain('"setup_skills"');
    expect(source).toContain('"setup_rules"');
    expect(source).toContain('"setup_agents"');
    expect(source).toContain('"setup_mcp_servers"');
    expect(source).toContain('"setup_migrations"');
  });
});
