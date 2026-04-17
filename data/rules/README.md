# data/rules

JSON rule files used by **Initialize** in the project Rules tab. Each file is copied into the project’s `.cursor/rules` as-is (JSON format).

- Add `.json` files here; **Initialize** copies only from this folder.
- Suggested shape: `{ "description": "...", "globs": "...", "alwaysApply": false, "content": "..." }`.
- **`initialize-all-manifest.json`** — defines the unified checklist and which files **Initialize all (essential)** copies (one curated file set per category tab). Edit this file to change the bundle; per-category **Initialize** still copies every `.json` under that category (and root for General).
