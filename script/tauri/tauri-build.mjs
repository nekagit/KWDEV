#!/usr/bin/env node
/**
 * Run Tauri build with the correct --bundles for the current platform:
 * - darwin: app (macOS .app)
 * - linux: appimage (portable .AppImage)
 * - win32: msi (or other Windows bundle)
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const targetDir = path.join(repoRoot, "src-tauri", "target");

const platform = process.platform;
const bundle = platform === "darwin" ? "app" : platform === "linux" ? "appimage" : "msi";

const env = { ...process.env, CARGO_TARGET_DIR: targetDir, CI: "false" };
const args = ["tauri", "build", "--bundles", bundle];

const child = spawn("npx", args, {
  stdio: "inherit",
  shell: true,
  env,
  cwd: repoRoot,
});
child.on("exit", (code) => process.exit(code ?? 0));
