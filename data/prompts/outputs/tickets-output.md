# Tickets Output

## Milestone: Paths and workspace validation for Windows

### Ticket 1: Make is_valid_workspace accept PowerShell scripts on Windows
**Description:** In `src-tauri/src/lib.rs`, update `is_valid_workspace` so that on Windows a directory is considered valid if it has either `script/worker/implement_all.ps1` or the existing `implement_all.sh` locations (script/implement_all.sh or script/worker/implement_all.sh), and still requires `data/` to be a directory. On non-Windows, keep the current logic (implement_all.sh in either location + data/). This allows Windows project roots that contain the PowerShell Worker scripts to be recognized by `project_root()` and related commands.
**Priority:** P1
**Acceptance Criteria:**
- [ ] When `is_windows()` is true, `is_valid_workspace(p)` returns true if `p.join("data").is_dir()` and at least one of: `p.join("script").join("worker").join("implement_all.ps1").exists()`, `p.join("script").join("implement_all.sh").exists()`, or `p.join("script").join("worker").join("implement_all.sh").exists()`
- [ ] When `is_windows()` is false, behavior is unchanged (current implement_all.sh checks + data/ directory)
- [ ] `project_root()` can resolve a Windows dev repo that has only the .ps1 Worker scripts (and data/) and no .sh scripts

### Ticket 2: Use platform-appropriate project root error message
**Description:** In `src-tauri/src/lib.rs`, in `project_root()`, replace the hardcoded error string that mentions `script/worker/implement_all.sh` with a message that depends on `is_windows()`: on Windows tell the user the repo root should contain `script/worker/implement_all.ps1` and `data/`; on Unix keep the current message (implement_all.sh and data/). This ensures Windows users get clear, actionable feedback when project root is not found.
**Priority:** P1
**Acceptance Criteria:**
- [ ] When `project_root()` returns `Err` and `is_windows()` is true, the error message mentions `script/worker/implement_all.ps1` and `data/`
- [ ] When `project_root()` returns `Err` and `is_windows()` is false, the error message still mentions `script/worker/implement_all.sh` and `data/`
- [ ] Message remains a single, readable sentence (e.g. "Project root not found. Run the app from the repo root (contains script/worker/implement_all.ps1 and data/)." on Windows)

### Ticket 3: Audit and fix remaining backend error messages for Windows
**Description:** In `src-tauri/src/lib.rs`, search for other error strings that mention script names (e.g. run_terminal_agent.sh, implement_all.sh), "repo root", or path hints used by the Worker flow. Where such strings are returned to the frontend (e.g. from commands invoked by the Worker tab), make them platform-aware: when `is_windows()` is true, reference .ps1 scripts or Windows-appropriate wording; otherwise keep current text. Focus on commands used by Run/Implement All (e.g. run_run_terminal_agent, run_implement_all, cursor_init/cursor_init zip resolution errors if they mention repo root). Do not change log-only or debug strings that are not user-facing.
**Priority:** P2
**Acceptance Criteria:**
- [ ] All user-facing error strings in lib.rs that mention Worker script names or "repo root" in a Worker-related path context are conditional on `is_windows()` where appropriate
- [ ] Unix behavior and message text unchanged when not on Windows
- [ ] No new runtime errors or regressions; existing success paths unchanged

### Ticket 4: Ensure Worker UI shows backend errors and paths correctly on Windows
**Description:** In the frontend (e.g. `src/components/molecules/TabAndContentSections/ProjectRunTab.tsx`, `src/store/run-store.ts`), ensure that when backend error messages (e.g. project root not found, script not found) or paths are displayed, they work correctly on Windows. Specifically: (1) Display backend error strings as-is so the platform-appropriate message from Tickets 2–3 is shown; (2) avoid frontend assumptions that paths use forward slashes or that script names end in .sh (e.g. do not hardcode "implement_all.sh" or "run_terminal_agent.sh" in user-facing copy—prefer generic wording or get platform from Tauri if we need to mention script names); (3) ensure any place that renders a project or script path (e.g. in toasts or error state) does not break when the path contains backslashes. Add a Tauri command or use an existing one to expose `is_windows` to the frontend only if needed for conditional copy.
**Priority:** P2
**Acceptance Criteria:**
- [ ] When the backend returns a project-root or script-not-found error, the UI shows that message to the user without altering it (so Windows users see the .ps1 message from the backend)
- [ ] No user-facing frontend string explicitly mentions only .sh script names (e.g. "implement_all.sh") unless it is platform-conditional; prefer "Worker script" or backend-driven message
- [ ] Paths displayed in the Worker/project context (e.g. project path, error text containing a path) render correctly on Windows (no broken layout or escaping of backslashes)
- [ ] If conditional copy is required, frontend has access to platform (e.g. invoke a Tauri command that returns whether the app is on Windows) and uses it only where necessary
