/**
 * Static analysis checklist: run all tools and collect one report.
 * Used by Worker Debugging "Apply static analysis checklist" to run via agent terminal.
 */

export interface StaticAnalysisTool {
  id: string;
  name: string;
  category: string;
  installCommand: string;
  runCommand: string;
  description: string;
  optional?: boolean;
}

export interface StaticAnalysisChecklistConfig {
  name: string;
  version: string;
  description: string;
  defaultDirs: { frontend: string; backend: string };
  reportFile: string;
  tools: StaticAnalysisTool[];
}

export const STATIC_ANALYSIS_CHECKLIST: StaticAnalysisChecklistConfig = {
  name: "Static analysis checklist",
  version: "1.0",
  description:
    "Run all tools and collect one report. From repo root: run each runCommand (after install if needed). For other projects, change 'frontend'/'backend' in runCommand to your app dirs.",
  defaultDirs: { frontend: "frontend", backend: "backend" },
  reportFile: "analysis-report.txt",
  tools: [
    {
      id: "tsc",
      name: "TypeScript (tsc --noEmit)",
      category: "frontend",
      installCommand: "cd frontend && npm install",
      runCommand: "cd frontend && npm run type-check",
      description: "Type errors; fix types in code or tsconfig.",
      optional: false,
    },
    {
      id: "eslint",
      name: "ESLint",
      category: "frontend",
      installCommand: "cd frontend && npm install",
      runCommand: "cd frontend && npm run lint",
      description: "Style, unused vars, React hooks; fix or eslint-disable.",
      optional: false,
    },
    {
      id: "check-imports",
      name: "Check imports (project script)",
      category: "frontend",
      installCommand: "already in project",
      runCommand: "cd frontend && npm run check-imports",
      description: "Project-specific import rules (e.g. atoms/molecules/organisms).",
      optional: true,
    },
    {
      id: "eslint-plugin-import-x",
      name: "eslint-plugin-import-x",
      category: "frontend",
      installCommand: "cd frontend && npm install -D eslint-plugin-import-x",
      runCommand: "cd frontend && npm run lint",
      description:
        "Import order, unresolved modules, no-cycle, no-self-import. Add plugin to eslint.config.js then run lint.",
      optional: true,
    },
    {
      id: "knip",
      name: "Knip",
      category: "frontend",
      installCommand: "cd frontend && npm install -D knip",
      runCommand: "cd frontend && npx knip",
      description: "Unused files, unused exports, unused dependencies, unlisted deps.",
      optional: true,
    },
    {
      id: "depcheck",
      name: "depcheck",
      category: "frontend",
      installCommand: "cd frontend && npm install -D depcheck",
      runCommand: "cd frontend && npx depcheck",
      description: "Unused and missing dependencies in package.json.",
      optional: true,
    },
    {
      id: "madge",
      name: "Madge",
      category: "frontend",
      installCommand: "cd frontend && npm install -D madge",
      runCommand: "cd frontend && npx madge --circular src/",
      description: "Circular dependency detection (and orphans, graph).",
      optional: true,
    },
    {
      id: "ruff",
      name: "Ruff (check)",
      category: "backend",
      installCommand: "pip install ruff (in venv) or brew install ruff",
      runCommand: "ruff check backend/",
      description: "Style, unused imports, likely bugs; many fixable with --fix.",
      optional: false,
    },
    {
      id: "ruff-format",
      name: "Ruff (format check)",
      category: "backend",
      installCommand: "same as ruff",
      runCommand: "ruff format backend/ --check",
      description: "Formatting (Black-style); fix with ruff format backend/.",
      optional: false,
    },
    {
      id: "ruff-security",
      name: "Ruff (security S rules)",
      category: "backend",
      installCommand: "same as ruff",
      runCommand: "ruff check backend/ --select S",
      description: "Security: weak crypto, try/except/pass, binding 0.0.0.0, etc.",
      optional: true,
    },
    {
      id: "semgrep",
      name: "Semgrep",
      category: "both",
      installCommand: "pip install semgrep (in venv) or brew install semgrep",
      runCommand: "semgrep scan --config auto frontend/ backend/",
      description: "SAST: security and quality rules across JS/TS and Python.",
      optional: true,
    },
    {
      id: "mypy",
      name: "mypy",
      category: "backend",
      installCommand: "cd backend && pip install -r requirements.txt (mypy in there)",
      runCommand: "cd backend && mypy app/",
      description: "Python type errors; requires mypy.ini or pyproject.toml config.",
      optional: true,
    },
    {
      id: "bandit",
      name: "Bandit",
      category: "backend",
      installCommand: "pip install bandit",
      runCommand: "bandit -r backend/",
      description: "Python security issues; overlaps with Ruff S.",
      optional: true,
    },
    {
      id: "flake8",
      name: "Flake8",
      category: "backend",
      installCommand: "cd backend && pip install flake8",
      runCommand: "cd backend && flake8 app/",
      description: "Style and simple bugs (PEP8); often replaced by Ruff.",
      optional: true,
    },
    {
      id: "black",
      name: "Black (format check)",
      category: "backend",
      installCommand: "cd backend && pip install black",
      runCommand: "cd backend && black --check app/",
      description: "Format check; fix with black app/.",
      optional: true,
    },
  ],
};

/**
 * Builds the agent prompt to run the static analysis checklist in the project.
 * Agent runs from repo root; runs each tool's install (if needed) and runCommand, appends output to reportFile.
 * @param selectedToolIds - When provided, only these tool IDs are included; when undefined or empty, all tools are used.
 */
export function buildStaticAnalysisPrompt(selectedToolIds?: string[]): string {
  const c = STATIC_ANALYSIS_CHECKLIST;
  const toolsToInclude =
    selectedToolIds?.length && selectedToolIds.length > 0
      ? c.tools.filter((t) => selectedToolIds.includes(t.id))
      : c.tools;
  const lines: string[] = [
    `You are in the project repository. Apply the following static analysis checklist and write a single report.`,
    ``,
    `**Report file (at repo root):** \`${c.reportFile}\``,
    ``,
    `**Do not install or run tools that do not apply to this project.**`,
    `- If this is a **frontend-only** project (e.g. Next.js, Vite, CRA with no Python backend): **skip all backend-only tools.** Do not install or run: ruff, ruff-format, ruff-security, mypy, bandit, flake8, black. You can detect "no backend" by: no \`backend/\` directory at repo root, and no \`requirements.txt\` or \`pyproject.toml\` at repo root (or only in a frontend subfolder). For Semgrep (both), run only on \`frontend/\` or \`src/\` if there is no backend.`,
    `- If the project has no \`frontend/\` directory (e.g. app is at repo root): use repo root for frontend tools (e.g. \`npm run type-check\` instead of \`cd frontend && npm run type-check\`).`,
    ``,
    `**Instructions:**`,
    `1. From the repo root, run each **applicable** tool below in order (skip backend-only tools when there is no Python backend).`,
    `2. For each tool: if installCommand is not "already in project" or "same as X", run installCommand first (ignore failures for optional tools).`,
    `3. Run runCommand; capture stdout and stderr.`,
    `4. Append to ${c.reportFile}: a clear section header with the tool name and id, then the full output.`,
    `5. Optional tools (marked below) may be skipped if install fails; for required tools, record any failure in the report.`,
    ``,
    `**Checklist (${c.name} v${c.version}):**`,
    ``,
  ];
  for (const t of toolsToInclude) {
    const categoryNote = t.category === "backend" ? " [backend-only — skip if no Python backend]" : t.category === "both" ? " [run on frontend only if no backend]" : "";
    lines.push(`### ${t.name} (id: ${t.id})${t.optional ? " [optional]" : ""}${categoryNote}`);
    lines.push(`- install: ${t.installCommand}`);
    lines.push(`- run: ${t.runCommand}`);
    lines.push(`- ${t.description}`);
    lines.push(``);
  }
  lines.push(
    `After running all applicable tools, print a short summary: path to ${c.reportFile} and how many tools succeeded vs failed.`
  );
  return lines.join("\n");
}
