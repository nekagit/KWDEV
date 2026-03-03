/**
 * Run the agent CLI with a prompt and capture stdout.
 * Used by API routes instead of OpenAI. Requires `agent` in PATH (or AGENT_CLI_PATH).
 * Server-side only.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_BUFFER = 4 * 1024 * 1024; // 4MB

/**
 * Run agent with the given prompt in the given project directory.
 * Writes prompt to a temp file and runs: agent -p "$(cat tempFile)" in projectPath.
 * @param projectPath - Absolute path to the project/repo (cwd for agent).
 * @param promptText - Full prompt text (can be long).
 * @returns Agent stdout as string.
 * @throws Error if agent is not found, times out, or exits non-zero (stderr included in message).
 */
export function runAgentPrompt(projectPath: string, promptText: string): Promise<string> {
  const resolvedProject = path.resolve(projectPath);
  const agentCli = (process.env.AGENT_CLI_PATH || "agent").trim() || "agent";

  let tmpPath: string | null = null;
  try {
    const tmpDir = os.tmpdir();
    tmpPath = path.join(tmpDir, `kw_agent_prompt_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmpPath, promptText, "utf-8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Promise.reject(new Error(`Failed to write prompt temp file: ${msg}`));
  }

  const env = { ...process.env, TMPFILE: tmpPath, AGENT_CLI: agentCli };
  const result = spawnSync(
    "bash",
    ["-c", '"$AGENT_CLI" --trust -p "$(cat "$TMPFILE")"'],
    {
      cwd: resolvedProject,
      env,
      encoding: "utf-8",
      maxBuffer: MAX_BUFFER,
      timeout: DEFAULT_TIMEOUT_MS,
    }
  );

  try {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  } catch {
    // ignore cleanup failure
  }

  if (result.error) {
    const err = result.error;
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return Promise.reject(
        new Error("Agent CLI not found. Install agent and ensure it is in PATH (or set AGENT_CLI_PATH).")
      );
    }
    return Promise.reject(new Error(err.message));
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const msg = stderr
      ? `Agent exited with code ${result.status}: ${stderr}`
      : `Agent exited with code ${result.status}.`;
    return Promise.reject(new Error(msg));
  }

  if (result.signal) {
    return Promise.reject(new Error(`Agent killed by signal: ${result.signal}`));
  }

  return Promise.resolve((result.stdout || "").trim());
}
