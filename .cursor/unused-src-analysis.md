# Unused files in `src/` — analysis

## Method

- **Entry points:** All `app/**/page.tsx`, `app/**/layout.tsx`, and `app/**/route.ts` under `src/`.
- **Resolution:** Recursive resolution of static `import … from "@/..."` and `import … from "./..."` (and relative paths). Only **static** imports are traced.
- **Result:** Any `.ts`/`.tsx` under `src/` not reached from an entry point is considered **unused** by this analysis.
- **Count:** 64 entry points, 342 used files, **60 files** reported as unused.

## Caveats

1. **Dynamic imports** are not traced. Example: `lib/noop-tauri-api.ts` is loaded by `lib/tauri.ts` via `import("@/lib/noop-tauri-api")` when not in Tauri — it is **used** and must not be deleted.
2. **Next.js convention files** (`app/error.tsx`, `app/global-error.tsx`) are not imported by app code; the framework uses them for error boundaries. **Keep** them.
3. **Test files** under `lib/__tests__/` are not imported by app entry points; they are run by the test runner. Deleting them is a product decision (remove dead tests vs keep for future use).
4. **Type declaration files** (`types/*.d.ts`) provide ambient types; they may not appear in the import graph. Verify usage (e.g. `pdf-parse` dependency) before removing.
5. **Dashboard-related code** (`DashboardMetricsCards`, `api-dashboard-metrics.ts`, `types/dashboard.ts`) is currently unreachable because `SimpleDashboard` was emptied; it is unused but could be restored if the dashboard is reimplemented.

---

## Unused files by category

### Do not delete (framework / false positive)

| File | Reason |
|------|--------|
| `app/error.tsx` | Next.js error boundary (convention) |
| `app/global-error.tsx` | Next.js global error boundary (convention) |
| `lib/noop-tauri-api.ts` | Used via dynamic import in `lib/tauri.ts` when not in Tauri |

### Review before delete (types / declarations)

| File | Note |
|------|------|
| `types/dashboard.ts` | Only used by dashboard code that is currently unused |
| `types/lucide-react-file-json.d.ts` | Ambient declaration; confirm no usage |
| `types/pdf-parse.d.ts` | Ambient for `pdf-parse`; package is in package.json but no runtime import found in src |
| `types/setup-json.d.ts` | Confirm no usage |
| `types/tauri-api.d.ts` | Tauri types; may be referenced by Rust or build |

### Components (unused in current app)

| File |
|------|
| `components/molecules/CardsAndDisplay/ThemePreviewCard.tsx` |
| `components/molecules/ControlsAndButtons/AnalyzeButtonSplit.tsx` |
| `components/molecules/Headers/ThemeNameHeader.tsx` |
| `components/molecules/Theme/ThemeButtonPreview.tsx` |
| `components/molecules/Theme/ThemeColorSwatches.tsx` |
| `components/molecules/Theme/ThemeIconPreview.tsx` |
| `components/organisms/Dashboards/DashboardMetricsCards.tsx` |
| `components/ui/progress.tsx` |

### Data

| File |
|------|
| `data/web-scraping-skill.ts` |

### Lib (unused in current app)

| File | Note |
|------|------|
| `lib/api-dashboard-metrics.ts` | Used only by removed dashboard UI |
| `lib/cursor-best-practice.ts` | |
| `lib/dashboard-focus-filter-shortcut.ts` | Was used by SimpleDashboard |
| `lib/download-run-as-md.ts` | |
| `lib/ideas-md.ts` | |
| `lib/parse-crontab-output.ts` | Was used by removed Server/Cron |
| `lib/parse-ssh-config.ts` | Was used by removed Server/SSH |
| `lib/skill-markdown.ts` | |
| `lib/xterm-utils.ts` | Was used by removed Server terminal |
| `lib/zeroclaw-parser.ts` | |

### Root

| File | Note |
|------|------|
| `proxy.ts` | Next.js 16 proxy; not referenced by next.config or any import |

### Test files (unused in import graph; used by test runner)

All under `lib/__tests__/` — treat as optional delete (removes test coverage for removed or unused code):

- `api-dashboard-metrics.test.ts`
- `api-projects.test.ts`
- `todos-kanban.test.ts`
- (and other test files under `lib/__tests__/`)

*(Full list of test files can be obtained by running the unused-files script or `find src/lib/__tests__ -name "*.ts" -o -name "*.tsx"`.)*

---

## Summary

- **Keep (3):** `app/error.tsx`, `app/global-error.tsx`, `lib/noop-tauri-api.ts`
- **Review (5):** `types/dashboard.ts`, `types/lucide-react-file-json.d.ts`, `types/pdf-parse.d.ts`, `types/setup-json.d.ts`, `types/tauri-api.d.ts`
- **Safe to delete after review:** All listed components, `data/web-scraping-skill.ts`, listed lib files, `proxy.ts`
- **Optional:** All `lib/__tests__/*` (decide per file or keep tests for possible future use)

---

## Execution (2025-03-03)

Phases 2–6 of the [deletion plan](.cursor/unused-src-deletion-plan.md) were applied.

- **Deleted:** 10 lib files, 8 components, 2 data/root files, 4 type files (dashboard, pdf-parse.d.ts, setup-json.d.ts was not present; tauri-api.d.ts), 4 test files.
- **Fix:** `ThemePreviewCard` was in the unused list but was still imported by `ThemeSelector`. It was not restored; instead a minimal inline theme card was added inside `ThemeSelector.tsx`.
- **Restored:** `types/lucide-react-file-json.d.ts` — CommandPalette imports `lucide-react/dist/esm/icons/file-json`; a minimal declaration was re-added so the build type-checks.
- **Verification:** `npm run build` and `npm test` (Vitest) passed. Lint was not re-run after clearing cache.
