import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project milestones tab layout", () => {
  it("uses tabs instead of accordion sections for list and content", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectMilestonesTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain(
      'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";'
    );
    expect(source).toContain('<Tabs defaultValue="milestones" className="w-full">');
    expect(source).toContain('<TabsTrigger value="milestones">Milestones</TabsTrigger>');
    expect(source).toContain('<TabsTrigger value="content"');
    expect(source).toContain('<TabsContent value="milestones" className="mt-0">');
    expect(source).toContain('<TabsContent value="content" className="mt-0">');
    expect(source).not.toContain("AccordionTrigger");
  });
});
