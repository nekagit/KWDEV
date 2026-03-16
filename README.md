# KWCode

**Desktop app to manage projects and run Cursor CLI agents (Ask, Plan, Fast dev, Debug) from one place.**  
One dashboard for your repos, Planner, Ideas, and agent runs — Cursor today; more CLIs and platforms on the roadmap.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://tauri.app)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-1.x-orange?logo=rust)](https://www.rust-lang.org)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#contributing)

---

## Screenshots

*Screenshot: [Coming soon] — Dashboard with Projects, Run, and Planner.*

---

## Features

- **Dashboard** — Overview, active projects, quick links to Projects, Run, Prompts, Ideas, Design, Architecture, Testing, Planner, Versioning, Documentation, and Configuration.
- **Projects** — Add repos by path; open in Cursor, terminal, or file manager.
- **Worker (Run) tab** — Per-project: **Ask** (read-only), **Plan** (design first), **Fast development** (run agent), **Debug** (paste logs, fix). Uses Cursor CLI with `--mode=ask|plan|debug`; terminal output and history.
- **Planner** — Kanban (tickets), milestones, sync with `.cursor/7. planner/tickets.md`.
- **Ideas, Prompts, Design, Architecture, Testing, Versioning, Documentation** — Per-project or global views; export/copy as Markdown, JSON, or CSV where applicable.
- **Configuration** — Data directory, app version, repository link, API health.
- **Command palette** (⌘K) — Navigation, copy/download actions, go to first project by tab.
- **Desktop app** — Tauri 2; single window, no browser required; SQLite + file storage.

---

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI (shadcn), Zustand.
- **Desktop:** Tauri 2 (Rust); WebView loads static export of the Next app.
- **Data:** SQLite (rusqlite in Tauri, better-sqlite3 in Node API); file-based (`data/`, `.cursor/`) for projects and prompts.
- **Agent integration:** Worker tab supports three agent providers (switch in project details header): **Cursor** CLI (`agent`), **Claude** Code CLI (`claude`), and **Gemini** CLI (`gemini` or `gemi`). Each is invoked via a shell script; the app works without them if you only use other features.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended).
- **Rust** (for Tauri desktop build): [rustup](https://rustup.rs).
- **Cursor CLI** (optional): for Worker tab when Cursor provider is selected; [install](https://cursor.com/docs/cli/overview).
- **Claude Code CLI** (optional): for Worker tab when Claude provider is selected; ensure `claude` is on PATH.
- **Gemini CLI** (optional): for Worker tab when Gemini provider is selected; ensure `gemini` or `gemi` is on PATH (see [Google AI](https://ai.google.dev/) or your Gemini CLI docs).
- **macOS** (primary); Windows/Linux — Tauri supports them; build and test on your platform.

---

## Install and run

**Clone and install:**

```bash
git clone <repo-url> && cd KW-February-KWCode
npm install
```

**Browser (no Tauri):**

```bash
npm run dev
```

Then open [http://127.0.0.1:4000](http://127.0.0.1:4000). Some features (file system, terminal agent) require the desktop app.

**Desktop (Tauri):**

```bash
npm run dev:tauri
```

Starts the Next dev server and Tauri window.

**Production build (desktop):**

```bash
npm run build:desktop
```

Builds the app and copies it to your Desktop (see [package.json](package.json) for more scripts).

---

## Project structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and API routes |
| `src/components/` | UI (atoms, molecules, organisms, shared, ui) |
| `src/lib/`, `src/store/`, `src/types/` | Logic, state, types |
| `src-tauri/` | Tauri (Rust) app, commands, SQLite, bundling |
| `script/` | Build and worker scripts (e.g. `run_terminal_agent.sh`) |
| `.cursor/` | Project-specific Cursor prompts, ADRs, docs (see [.cursor/README.md](.cursor/README.md)) |

---

## Future & coming soon

We’re focusing on Cursor CLI today but want KWCode to be useful across tools and platforms. Planned or under consideration:

- **Windows scripts** — PowerShell or batch equivalents of `run_terminal_agent.sh` / `implement_all.sh` so the Worker tab works the same on Windows.
- **Claude Code / Claude CLI** — Optional integration so you can run Claude-based agents from the same UI (Ask, Plan, Debug) alongside or instead of Cursor.
- **Other CLI integrations** — Support for more AI/IDE CLIs (e.g. Windsurf, Aider, or custom agents) so you can plug in your preferred tool and keep one dashboard.
- **Cross-platform parity** — Smoother builds and docs for Windows and Linux, including installers and path handling.
- **Templates** — Optional project and `.cursor` templates (stacks, frameworks) for seeding new projects.

**Ideas & improvements (optional):** Dark/light theme refinements, more export formats, keyboard shortcuts for every action, optional cloud sync for projects list, and better accessibility. If you have a “coming soon” you care about, open an issue or discuss in a PR.

These are goals and ideas, not promises — contributions and feedback on priorities are welcome (see [Contributing](#contributing)).

---

## Documentation

For detailed Cursor usage, agents, and workflows, see [.cursor/README.md](.cursor/README.md).

---

## Contributing

Contributions are welcome. Please open an issue or PR.

---

## License

This project is licensed under the [MIT](LICENSE) License.
