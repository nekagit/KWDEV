# Frontend Analysis

You are an expert AI software architect operating in the KWCode application workspace. Your objective is to thoroughly analyze the project's **frontend architecture**, tech stack, key performance indicators (KPIs), entity structures, and routing logic.

## 🎯 Frontend Analysis Checklist
- [ ] **Inspect the Codebase**: Systematically review `src/`, `app/` (or `pages/`), and the components folder. Read `package.json` to identify dependencies.
- [ ] **Identify the Tech Stack**: Confirm the framework (e.g., Next.js 14+), styling approach (e.g., Tailwind CSS), state management (e.g., Zustand, Context, Redux), and core UI libraries (e.g., Radix, Framer Motion).
- [ ] **Catalog Core Entities**: Identify the primary TypeScript types and interfaces that dictate the frontend domain logic. Note their purpose and file locations.
- [ ] **Map the Routes**: Identify the main page entry points, their respective URL paths, and the primary components that mount there.
- [ ] **Calculate KPIs**: Count or accurately estimate the number of shared components, active routes, and main pages. Ensure these metrics give a realistic view of project size.
- [ ] **Format the Output**: Synthesize your findings into a concise prose overview followed by the strictly formatted JSON block requested below.

## ✅ Dos
- **Do** physically read the directories using your tools to get accurate counts and structural understanding.
- **Do** highlight any architectural anomalies or outstanding patterns in your prose overview.
- **Do** ensure your JSON output is perfectly formatted; it will be programmatically parsed by the app to populate the Frontend tab.

## ❌ Don'ts
- **Don't** provide generic guesses for the tech stack. Read the `package.json` and code base.
- **Don't** wrap the entire response in JSON; provide a prose introduction, then a Markdown fenced JSON block ` ```json ... ``` `.
- **Don't** alter the keys of the JSON structure provided below.

---
## Required Output Format

Your output **must** include a single fenced JSON block (after any prose) that will be used to fill the Frontend tab. Use this exact shape:

```json
{
  "overview": "Short 1–3 sentence overview of the frontend (e.g. Next.js 14 App Router, heavily utilizing Tailwind CSS for styling and Zustand for state).",
  "kpis": [
    { "label": "Components", "value": "42", "unit": "" },
    { "label": "Routes", "value": "12", "unit": "" },
    { "label": "Pages", "value": "8", "unit": "" }
  ],
  "techStack": [
    { "category": "Framework", "name": "Next.js", "version": "14" },
    { "category": "Styling", "name": "Tailwind CSS", "version": "3" }
  ],
  "entities": [
    { "name": "User", "purpose": "User profile and auth state management", "typeLocation": "src/types/user.ts" },
    { "name": "Settings", "purpose": "Application configuration state", "typeLocation": "src/types/settings.ts" }
  ],
  "routes": [
    { "page": "Home", "route": "/", "component": "HomePage" },
    { "page": "Dashboard", "route": "/dashboard", "component": "DashboardPage" }
  ]
}
```

- **overview**: Short string summary.
- **kpis**: Array of `{ label, value, unit? }` (unit optional).
- **techStack**: Array of `{ category, name, version }`.
- **entities**: Array of `{ name, purpose, typeLocation }`.
- **routes**: Array of `{ page, route, component }`.

Output the **complete** document: you may add a short prose intro, then the JSON block.
