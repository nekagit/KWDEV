#!/usr/bin/env node
/**
 * After tauri:build, copy the bundle to ~/Desktop/KWCODE.
 * Run: npm run tauri:build && node script/tauri/copy-build-to-desktop.mjs
 */
import { cpSync, mkdirSync, readdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const bundleDir = path.join(repoRoot, "src-tauri", "target", "release", "bundle");
const desktopDir = path.join(process.env.HOME, "Desktop", "KWCODE");

if (!existsSync(bundleDir)) {
  console.error("Bundle not found. Run: npm run tauri:build");
  process.exit(1);
}

mkdirSync(desktopDir, { recursive: true });

// Copy bundle contents (macos/*.app, etc.) into Desktop/KWCODE
for (const name of readdirSync(bundleDir)) {
  const src = path.join(bundleDir, name);
  const dest = path.join(desktopDir, name);
  cpSync(src, dest, { recursive: true });
  console.log("Copied:", name, "->", desktopDir);
}

console.log("Done. Build is in", desktopDir);
