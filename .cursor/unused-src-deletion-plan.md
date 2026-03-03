# Plan to delete unused files in `src/`

This plan applies the analysis in [unused-src-analysis.md](.cursor/unused-src-analysis.md). **Do not delete** the files listed there under "Do not delete".

---

## Phase 0: Do not delete

- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/lib/noop-tauri-api.ts`

---

## Phase 1: Review type declarations

Before deleting any `types/*` file:

1. **types/dashboard.ts** — Only used by dashboard code. Safe to delete if you delete `api-dashboard-metrics.ts` and `DashboardMetricsCards.tsx`.
2. **types/lucide-react-file-json.d.ts** — Grep for `lucide-react-file-json` or usage of the declared types; delete if unused.
3. **types/pdf-parse.d.ts** — No runtime import of `pdf-parse` in src; if you remove pdf-parse usage everywhere, delete this and consider removing the `pdf-parse` dependency from package.json.
4. **types/setup-json.d.ts** — Grep for `setup-json` or related types; delete if unused.
5. **types/tauri-api.d.ts** — Confirm not required by Tauri/Rust or build; then delete if unused.

---

## Phase 2: Delete unused lib files (non-test)

Delete in any order (no dependency between them for runtime):

- `src/lib/api-dashboard-metrics.ts`
- `src/lib/cursor-best-practice.ts`
- `src/lib/dashboard-focus-filter-shortcut.ts`
- `src/lib/download-run-as-md.ts`
- `src/lib/ideas-md.ts`
- `src/lib/parse-crontab-output.ts`
- `src/lib/parse-ssh-config.ts`
- `src/lib/skill-markdown.ts`
- `src/lib/xterm-utils.ts`
- `src/lib/zeroclaw-parser.ts`

---

## Phase 3: Delete unused components

- `src/components/molecules/CardsAndDisplay/ThemePreviewCard.tsx`
- `src/components/molecules/ControlsAndButtons/AnalyzeButtonSplit.tsx`
- `src/components/molecules/Headers/ThemeNameHeader.tsx`
- `src/components/molecules/Theme/ThemeButtonPreview.tsx`
- `src/components/molecules/Theme/ThemeColorSwatches.tsx`
- `src/components/molecules/Theme/ThemeIconPreview.tsx`
- `src/components/organisms/Dashboards/DashboardMetricsCards.tsx`
- `src/components/ui/progress.tsx`

---

## Phase 4: Delete data and root

- `src/data/web-scraping-skill.ts`
- `src/proxy.ts`

---

## Phase 5: Delete reviewed type files

After Phase 1 review, delete only the type files confirmed unused:

- `src/types/dashboard.ts` (if dashboard code is removed)
- `src/types/lucide-react-file-json.d.ts` (if confirmed unused)
- `src/types/pdf-parse.d.ts` (if pdf-parse is not used)
- `src/types/setup-json.d.ts` (if confirmed unused)
- `src/types/tauri-api.d.ts` (if confirmed unused)

---

## Phase 6 (optional): Delete test files

If you want to remove tests for deleted or unused code:

- List all files under `src/lib/__tests__/` and delete those whose subject (e.g. `api-dashboard-metrics`, server/SSH, cron) has been removed or is unused.
- Or delete the entire `src/lib/__tests__/` directory if you are consolidating tests elsewhere or dropping coverage for this code.

---

## Verification after deletions

1. **Build:** `npm run build` (or your project build command).
2. **Lint:** `npm run lint` (if available).
3. **Tests:** `npm test` or `npx vitest run` (if you kept some tests).
4. **Typecheck:** `npx tsc --noEmit` (if applicable).

If anything breaks, restore the deleted file(s) that the error references and remove them from this plan or the analysis doc.
