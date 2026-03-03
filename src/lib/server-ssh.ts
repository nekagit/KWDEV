type Client = import('ssh2').Client;
type ConnectConfig = import('ssh2').ConnectConfig;
type ClientChannel = import('ssh2').ClientChannel;

import crypto from "crypto";
const { Client: SSHClient } = require("ssh2");

/** Max bytes to keep in output buffer when no client is connected (so reconnecting users see recent output). */
const OUTPUT_BUFFER_MAX_BYTES = 512 * 1024; // 512 KB

export interface SSHSession {
    client: Client;
    shell?: ClientChannel;
    lastActive: number;
    outputBuffer: string[];
    /** Current byte length of outputBuffer; used to cap size. Set when shell is created. */
    outputBufferBytes?: number;
}

// Global connection pool
// This keeps SSH sessions alive between API requests in Next.js (when running locally)
const globalStore = (global as any) as {
    sshConnections?: Map<string, SSHSession>;
};

if (!globalStore.sshConnections) {
    globalStore.sshConnections = new Map<string, SSHSession>();
}

export const sshConnections = globalStore.sshConnections;

/**
 * Connects to a remote server over SSH and stores the session.
 */
export async function connectSSH(config: ConnectConfig): Promise<string> {
    return new Promise((resolve, reject) => {
        const client: Client = new SSHClient();

        client.on("ready", () => {
            const sessionId = crypto.randomUUID();
            sshConnections.set(sessionId, {
                client,
                lastActive: Date.now(),
                outputBuffer: [],
                outputBufferBytes: 0,
            });
            resolve(sessionId);
        });

        client.on("error", (err: Error) => {
            console.error("SSH Connection Error:", err.message);
            reject(err);
        });

        client.on("end", () => {
            // Find and clean up session
            for (const [id, session] of sshConnections.entries()) {
                if (session.client === client) {
                    sshConnections.delete(id);
                    break;
                }
            }
        });

        client.on("close", () => {
            for (const [id, session] of sshConnections.entries()) {
                if (session.client === client) {
                    sshConnections.delete(id);
                    break;
                }
            }
        });

        try {
            client.connect({
                ...config,
                readyTimeout: 10000, // 10s timeout
            });
        } catch (err: any) {
            reject(err);
        }
    });
}

/**
 * Gets an active SSH session by ID. Throws if not found or inactive.
 */
export function getSSHSession(sessionId: string): SSHSession {
    const session = sshConnections.get(sessionId);
    if (!session) {
        throw new Error("SSH Session not found or expired");
    }
    session.lastActive = Date.now();
    return session;
}

/**
 * Disconnects an SSH session.
 */
export function disconnectSSH(sessionId: string) {
    const session = sshConnections.get(sessionId);
    if (session) {
        session.client.end();
        sshConnections.delete(sessionId);
    }
}

/**
 * Executes a one-off command over an established SSH session.
 * Returns stdout, stderr, and the process exit code (0 = success).
 */
export async function executeCommand(
    sessionId: string,
    command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = getSSHSession(sessionId);

    return new Promise((resolve, reject) => {
        session.client.exec(command, (err, stream) => {
            if (err) return reject(err);

            let stdout = "";
            let stderr = "";

            stream.on("data", (data: Buffer) => {
                stdout += data.toString("utf-8");
            });

            stream.stderr.on("data", (data: Buffer) => {
                stderr += data.toString("utf-8");
            });

            stream.on("close", (code: number, signal: string) => {
                resolve({ stdout, stderr, exitCode: code ?? -1 });
            });
        });
    });
}

/**
 * Gets or creates the interactive shell channel for a session.
 */
export async function getInteractiveShell(sessionId: string): Promise<ClientChannel> {
    const session = getSSHSession(sessionId);
    if (session.shell) return session.shell;

    return new Promise((resolve, reject) => {
        // Request a pty with common terminal dimensions
        session.client.shell({ term: "xterm-256color", rows: 24, cols: 80 }, (err, stream) => {
            if (err) return reject(err);

            session.shell = stream;

            // Buffer data so when a client reconnects (e.g. user came back to the page) they get output from while they were away
            if (session.outputBufferBytes == null) session.outputBufferBytes = 0;
            stream.on("data", (data: Buffer) => {
                const str = data.toString("utf-8");
                session.outputBuffer.push(str);
                session.outputBufferBytes! += Buffer.byteLength(str, "utf-8");
                while (session.outputBufferBytes! > OUTPUT_BUFFER_MAX_BYTES && session.outputBuffer.length > 1) {
                    const removed = session.outputBuffer.shift();
                    if (removed != null) session.outputBufferBytes! -= Buffer.byteLength(removed, "utf-8");
                }
            });

            stream.on("close", () => {
                session.shell = undefined;
            });

            resolve(stream);
        });
    });
}

/**
 * Cleanup stale connections (older than 30 mins)
 */
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sshConnections.entries()) {
        if (now - session.lastActive > 30 * 60 * 1000) {
            session.client.end();
            sshConnections.delete(id);
        }
    }
}, 60000); // Check every minute
