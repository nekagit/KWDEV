#!/usr/bin/env node
/**
 * Build Next.js for Tauri static export.
 * Temporarily moves the entire app/api directory aside so Next can complete static export:
 * API routes use dynamic = "force-dynamic", which is incompatible with output: "export".
 * The Tauri build serves static assets; API calls go to an external server (e.g. 127.0.0.1:4000).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const apiDir = path.join(repoRoot, "src", "app", "api");
const apiDirBak = path.join(repoRoot, ".api.tauri-bak");
const cursorInitZip = path.join(repoRoot, "cursor_init.zip");
const cursorInitZipDot = path.join(repoRoot, ".cursor_init.zip");

/** Ensure cursor_init.zip exists for Tauri bundle (copy from .cursor_init.zip if needed). */
function ensureCursorInitZip() {
  if (fs.existsSync(cursorInitZip)) return;
  if (fs.existsSync(cursorInitZipDot)) {
    fs.copyFileSync(cursorInitZipDot, cursorInitZip);
    console.log("[build-for-tauri] Copied .cursor_init.zip to cursor_init.zip for bundle");
  }
}

function moveAside() {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiDirBak);
    console.log("[build-for-tauri] Moved src/app/api aside (avoids force-dynamic vs output:export conflict)");
  }
}

function restore() {
  if (fs.existsSync(apiDirBak)) {
    fs.renameSync(apiDirBak, apiDir);
    console.log("[build-for-tauri] Restored src/app/api");
  }
}

ensureCursorInitZip();
moveAside();
const child = spawn("npm", ["run", "build"], {
  stdio: "inherit",
  shell: true,
  cwd: repoRoot,
  env: { ...process.env, TAURI_BUILD: "1", NEXT_PUBLIC_IS_TAURI: "true" },
});
child.on("exit", (code) => {
  restore();
  process.exit(code ?? 0);
});
