import { NextResponse } from "next/server";
import { parseSSHConfig, type SSHConfigHost } from "@/lib/parse-ssh-config";
import fs from "fs/promises";
import path from "path";
import os from "os";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function GET() {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, ".ssh", "config");
    let content: string;
    try {
      content = await fs.readFile(configPath, "utf-8");
    } catch {
      return NextResponse.json({ hosts: [] as SSHConfigHost[] });
    }
    const hosts = parseSSHConfig(content);
    return NextResponse.json({ hosts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read SSH config";
    return NextResponse.json({ error: message, hosts: [] }, { status: 500 });
  }
}
