import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project project tab skills", () => {
  it("adds Skills and Design inner tabs in Setup", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain('"skills"');
    expect(source).toContain('"design"');
    expect(source).toContain("Skills");
    expect(source).toContain("Design");
    expect(source).toContain('<TabsTrigger value="skills"');
    expect(source).toContain('<TabsTrigger value="design"');
    expect(source).toContain('<TabsContent value="skills"');
    expect(source).toContain('<TabsContent value="design"');
    expect(source).toContain("ProjectDesignTab");
  });
});
