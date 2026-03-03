import { NextResponse } from "next/server";
import { connectSSH } from "@/lib/server-ssh";
import { resolveSSHConfigHost } from "@/lib/parse-ssh-config";
import { getDb } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import os from "os";

function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/")) return path.join(os.homedir(), filePath.slice(2));
  if (filePath === "~") return os.homedir();
  return filePath;
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { host, port, username, password, privateKey, sshConfigHost, serverId } = body;

    let config: { host: string; port: number; username: string; password?: string; privateKey?: string };

    if (serverId && typeof serverId === "string") {
      const db = getDb();
      const row = db.prepare("SELECT * FROM server_profiles WHERE id = ?").get(serverId) as {
        host: string;
        port: number;
        username: string;
        auth_type: string;
        auth_data: string | null;
      } | undefined;
      if (!row) {
        return NextResponse.json({ error: "Server profile not found." }, { status: 400 });
      }
      config = {
        host: row.host,
        port: row.port || 22,
        username: row.username,
      };
      if (row.auth_type === "password" && row.auth_data) {
        config.password = row.auth_data;
      } else if (row.auth_type === "key" && row.auth_data) {
        config.privateKey = row.auth_data;
      } else {
        return NextResponse.json({ error: "Profile has no password or key." }, { status: 400 });
      }
    } else if (sshConfigHost && typeof sshConfigHost === "string") {
      const homedir = os.homedir();
      const configPath = path.join(homedir, ".ssh", "config");
      let content: string;
      try {
        content = await fs.readFile(configPath, "utf-8");
      } catch {
        return NextResponse.json(
          { error: "Could not read ~/.ssh/config." },
          { status: 400 }
        );
      }
      const resolved = resolveSSHConfigHost(content, sshConfigHost.trim());
      if (!resolved) {
        return NextResponse.json(
          { error: `No SSH config host found for "${sshConfigHost}".` },
          { status: 400 }
        );
      }
      if (!resolved.hostName || !resolved.user) {
        return NextResponse.json(
          { error: `SSH config "${sshConfigHost}" is missing HostName or User.` },
          { status: 400 }
        );
      }
      if (!resolved.identityFile) {
        return NextResponse.json(
          { error: `SSH config "${sshConfigHost}" has no IdentityFile. Add IdentityFile to that host in ~/.ssh/config for key-based SSH only.` },
          { status: 400 }
        );
      }
      const keyPath = expandTilde(resolved.identityFile);
      let keyContent: string;
      try {
        keyContent = await fs.readFile(keyPath, "utf-8");
      } catch {
        return NextResponse.json(
          { error: `Could not read key file: ${resolved.identityFile}.` },
          { status: 400 }
        );
      }
      // SSH config path: key-based only, no password
      config = {
        host: resolved.hostName,
        port: resolved.port ?? 22,
        username: resolved.user,
        privateKey: keyContent,
      };
    } else {
      if (!host || !username) {
        return NextResponse.json({ error: "Host and username are required." }, { status: 400 });
      }
      config = {
        host,
        port: port || 22,
        username,
      };
      if (password) {
        config.password = password;
      } else if (privateKey) {
        config.privateKey = privateKey;
      } else {
        return NextResponse.json({ error: "Password or private key is required." }, { status: 400 });
      }
    }

    const sessionId = await connectSSH(config);
    return NextResponse.json({ sessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
