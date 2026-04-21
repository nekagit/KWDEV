# Idea Analysis Output

## Project Summary

KWCode is a desktop app (Tauri 2 + Next.js 16) that lets users manage project repos and run Cursor CLI agents from one place. Users get a single dashboard for projects, a Worker (Run) tab for Ask/Plan/Fast dev/Debug and Implement All via Cursor CLI, a Planner (Kanban and tickets), and per-project or global views for Ideas, Prompts, Design, Architecture, Testing, Versioning, and Documentation. Data lives in SQLite and file-based storage (e.g. `.cursor/`); the Worker tab invokes shell scripts (`run_terminal_agent.sh`, `implement_all.sh`) that call the Cursor agent binary.

## Current State

- **Implemented:** Dashboard with quick links; Projects (add by path, Initialize from `.cursor_init.zip` or folder, Starter template, open in Cursor/terminal/file manager); Worker tab with Ask/Plan/Fast dev/Debug and Implement All, terminal output and run history; Planner (Kanban, tickets, sync with `.cursor/7. planner/tickets.md`); Ideas, Prompts, Design, Architecture, Testing, Versioning, Documentation (per-project or global, with export/copy); App Analyzer (URL audits: SEO, Legal/Impressum by category); Configuration, command palette (⌘K), shortcuts; Database view; Technologies page. Project tab Run section has a manual Refresh for package.json scripts (ADR 0222).
- **In progress:** Windows support for the Worker tab (ADR 0220). Platform detection is done (ADR 0221): `is_windows()` exists and script-path helpers branch on it, but both branches still return Unix `.sh` paths; spawn logic still uses `bash`. No PowerShell scripts exist; Windows users cannot run the Worker tab today.
- **Placeholder:** The `/analyzer` route is a stub (“Content coming soon”); the implemented analyzer is at `/app-analyzer`.
- **Recent work:** Run section refresh for package.json scripts (ADR 0222), Initialize zip or folder (ADR 0219), ticket export (CSV/Markdown), design/architecture export, command-palette and shortcut improvements.

## Next Feature Idea

**Title:** Complete Windows support for the Worker tab

**Description:** Finish the Windows Worker support already scoped in ADR 0220 and milestones: implement PowerShell equivalents of `run_terminal_agent.sh` and `implement_all.sh`, make the Tauri backend resolve and run the correct script per platform (PowerShell on Windows, bash on Unix), ensure Windows builds bundle the Windows scripts, and add path/bundle handling plus testing and documentation. Users on Windows will then run Ask, Plan, Fast dev, Debug, and Implement All from the same UI as on macOS, with terminal output and run history behaving the same way.

**Rationale:** The README lists “Windows scripts” as the first item under “Future & coming soon” and states that PowerShell or batch equivalents are needed so the Worker tab works the same on Windows. The decision to build this feature is already accepted (ADR 0220), and the backend is partially ready (platform detection and path branching in place). The core value of KWCode—running Cursor CLI agents from one dashboard—is currently unavailable on Windows. Completing this feature unlocks the product for a large segment of users, aligns with the existing architecture (frontend unchanged; backend gains real Windows script paths and spawn logic), and is already broken into clear milestones: run_terminal_agent for Windows, implement_all for Windows, bundling and path handling, then testing and documentation. It is substantial (multiple milestones/tickets) and is a user-visible, product-level improvement.

## Implementation Considerations

- **Backend (Tauri):** In `src-tauri/src/lib.rs`, `run_terminal_agent_script_path()` and `implement_all_script_path()` currently return `.sh` on both platforms; on Windows they should return `.ps1` paths (e.g. `script/worker/run_terminal_agent.ps1`). Spawn logic in `run_run_terminal_agent_script_inner` and `run_implement_all_script_inner` must branch on `is_windows()` and use PowerShell (e.g. `powershell -ExecutionPolicy Bypass -File script.ps1 ...`) or `cmd` on Windows instead of `bash`.
- **Scripts:** Add `script/worker/run_terminal_agent.ps1` and `script/worker/implement_all.ps1` that mirror the Bash scripts: accept project path, prompt content, agent mode (ask/plan/debug/agent), invoke Cursor CLI, and stream or capture output so the app can consume it. Argument and environment passing must match what the Rust side sends.
- **Bundling:** `tauri.conf.json` and `script/build-for-tauri.mjs` (or equivalent) bundle the `.sh` script today; Windows builds should bundle the `.ps1` script(s), and resource resolution should be platform-aware.
- **Paths:** Project root detection and `is_valid_workspace` may need Windows-friendly logic (e.g. accept projects that have the PowerShell script(s) on Windows). Error messages and path display in the UI should be platform-appropriate.
- **Testing and docs:** Manual or CI testing on Windows for Run and Implement All; document Cursor CLI install and usage on Windows in the README.
