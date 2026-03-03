# Milestones Output

## Feature: Complete Windows support for the Worker tab

### Milestone 1: PowerShell run_terminal_agent and backend wiring
**Description:** Implement `script/worker/run_terminal_agent.ps1` that mirrors the Bash script (project path, prompt content, agent mode ask/plan/debug/agent, Cursor CLI invocation, output streaming). Update Tauri backend so `run_terminal_agent_script_path()` returns the `.ps1` path on Windows and `run_run_terminal_agent_script_inner` spawns via PowerShell (e.g. `powershell -ExecutionPolicy Bypass -File script.ps1 ...`) when `is_windows()` is true. After this milestone, Ask, Plan, Fast dev, and Debug work on Windows with terminal output and run history.
**Depends On:** None

### Milestone 2: PowerShell implement_all and backend wiring
**Description:** Implement `script/worker/implement_all.ps1` that mirrors `implement_all.sh` (project path, arguments, Cursor CLI, output). Update `implement_all_script_path()` to return the `.ps1` path on Windows and `run_implement_all_script_inner` to spawn via PowerShell on Windows. After this milestone, Implement All works on Windows with the same UI behavior as on macOS.
**Depends On:** Milestone 1

### Milestone 3: Bundling and platform-aware resources
**Description:** Update `tauri.conf.json` and the build script (e.g. `script/build-for-tauri.mjs`) so Windows builds bundle the `.ps1` scripts and resource resolution is platform-aware (correct script paths for the bundled app on Windows). Ensure the app finds and runs the bundled PowerShell scripts in production Windows builds.
**Depends On:** Milestone 2

### Milestone 4: Paths and workspace validation for Windows
**Description:** Add Windows-friendly logic for project root detection and `is_valid_workspace` (e.g. accept projects that have the PowerShell scripts on Windows). Ensure error messages and path display in the UI are platform-appropriate so Windows users get clear feedback.
**Depends On:** Milestone 2

### Milestone 5: Testing and documentation
**Description:** Add manual or CI testing on Windows for Run (Ask/Plan/Debug) and Implement All. Update the README (and any relevant docs) with Cursor CLI install and usage instructions for Windows so users can get the Worker tab running end-to-end.
**Depends On:** Milestone 3, Milestone 4
