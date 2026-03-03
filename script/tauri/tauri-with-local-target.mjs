#!/usr/bin/env node
/**
 * Run Tauri CLI with CARGO_TARGET_DIR set to this project's src-tauri/target.
 * Prevents Cargo from using another project's target (e.g. automated_development)
 * which causes "failed to read plugin permissions" when paths differ.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const targetDir = path.join(repoRoot, "src-tauri", "target");

const env = { ...process.env, CARGO_TARGET_DIR: targetDir };
const args = process.argv.slice(2);
const child = spawn("npx", ["tauri", ...args], {
  stdio: "inherit",
  shell: true,
  env,
  cwd: repoRoot,
});
child.on("exit", (code) => process.exit(code ?? 0));
