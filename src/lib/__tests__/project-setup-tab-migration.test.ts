import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project setup tab migration", () => {
  it("adds Setup to bottom project detail tabs", () => {
    const detailsPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(detailsPath, "utf8");

    expect(source).toContain('value: "setup"');
    expect(source).toContain('data-testid={`tab-${tab.value}`}');
    expect(source).toContain('<TabsContent\n            value="setup"');
  });

  it("persists setup as a valid project detail tab", () => {
    const preferencePath = path.join(
      process.cwd(),
      "src/lib/project-detail-tab-preference.ts"
    );
    const source = fs.readFileSync(preferencePath, "utf8");
    expect(source).toContain('"setup"');
  });

  it("routes setup sections to setup mode and keeps project mode separate", () => {
    const detailsPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(detailsPath, "utf8");
    expect(source).toContain("<ProjectProjectTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} mode=\"project\" />");
    expect(source).toContain("<ProjectProjectTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} mode=\"setup\" />");
  });

  it("removes project files action buttons from the project mode header strip", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");
    expect(source).not.toContain("Rebuild");
    expect(source).not.toContain("Delete all");
    expect(source).not.toContain("Put on Desktop");
    expect(source).not.toContain(">\\n                    Refresh\\n");

    const filesTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectFilesTab.tsx"
    );
    const filesSource = fs.readFileSync(filesTabPath, "utf8");
    expect(filesSource).not.toContain('title="Refresh"');
  });
});
