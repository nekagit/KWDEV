import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project bottom run tab migration", () => {
  it("adds run to project detail bottom tabs and valid tab values", () => {
    const detailsPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const detailsSource = fs.readFileSync(detailsPath, "utf8");
    expect(detailsSource).toContain('value: "run"');
    expect(detailsSource).toContain("data-[state=active]:bg-emerald-500/90");

    const preferencePath = path.join(
      process.cwd(),
      "src/lib/project-detail-tab-preference.ts"
    );
    const preferenceSource = fs.readFileSync(preferencePath, "utf8");
    expect(preferenceSource).toContain('"run"');
  });

  it("moves run controls out of project inner tabs", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");
    expect(source).not.toContain('TabsTrigger value="run"');
    expect(source).not.toContain('TabsContent value="run"');
    expect(source).not.toContain("runNpmScriptInExternalTerminal");
    expect(source).not.toContain("runNpmScript");
    expect(source).not.toContain("TerminalSlot");
  });

  it("provides dedicated run tab surface with scripts, port control, and collapsible terminal", () => {
    const runTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectBottomRunTab.tsx"
    );
    const source = fs.readFileSync(runTabPath, "utf8");
    expect(source).not.toContain("COMMON_PORTS");
    expect(source).not.toContain("SelectTrigger");
    expect(source).toContain("Open running app");
    expect(source).toContain("placeholder=\"Port\"");
    expect(source).toContain("const parsedPortInput = parseInt(portInput.trim(), 10);");
    expect(source).toContain("const hasValidPortInput =");
    expect(source).toContain("parsedPortInput >= 1 && parsedPortInput <= 65535");
    expect(source).toContain("Scripts");
    expect(source).toContain("Terminal output");
    expect(source).toContain("TerminalSlot");
    expect(source).toContain('ScrollArea className="h-[calc(100vh-14rem)] w-full max-w-full overflow-x-hidden"');
  });

  it("renders scripts section as a collapsed-by-default accordion", () => {
    const runTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectBottomRunTab.tsx"
    );
    const source = fs.readFileSync(runTabPath, "utf8");
    expect(source).toContain("const [scriptsExpanded, setScriptsExpanded] = useState(false);");
    expect(source).toContain("Open scripts");
    expect(source).toContain("Collapse scripts");
    expect(source).toContain("{scriptsExpanded &&");
  });

  it("runs scripts in the in-app terminal output panel", () => {
    const runTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectBottomRunTab.tsx"
    );
    const source = fs.readFileSync(runTabPath, "utf8");
    expect(source).toContain("const runNpmScript = useRunStore((s) => s.runNpmScript);");
    expect(source).not.toContain("runNpmScriptInExternalTerminal");
    expect(source).toContain("toast.success(\"Running. Output below.\")");
    expect(source).toContain("r.label.startsWith(\"npm run \")");
  });

  it("keeps run tab layout constrained to viewport width", () => {
    const runTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectBottomRunTab.tsx"
    );
    const terminalSlotPath = path.join(
      process.cwd(),
      "src/components/molecules/Display/TerminalSlot.tsx"
    );
    const runTabSource = fs.readFileSync(runTabPath, "utf8");
    const detailsPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const detailsSource = fs.readFileSync(detailsPath, "utf8");
    const terminalSlotSource = fs.readFileSync(terminalSlotPath, "utf8");

    expect(runTabSource).toContain("overflow-x-hidden");
    expect(runTabSource).toContain("min-w-0");
    expect(runTabSource).toContain("!whitespace-normal");
    expect(runTabSource).toContain("min-w-0 break-all whitespace-normal");
    expect(detailsSource).toContain("overflow-y-auto overflow-x-hidden");
    expect(terminalSlotSource).toContain("flex-wrap");
    expect(terminalSlotSource).toContain("min-w-0");
  });
});
