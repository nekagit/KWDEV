/**
 * Parse OpenSSH ~/.ssh/config into host blocks.
 * Used to list SSH config hosts and to connect by alias.
 */

export interface SSHConfigHost {
  /** Host alias(es) from the Host line (first one is the primary). */
  host: string;
  hostName?: string;
  user?: string;
  port?: number;
  identityFile?: string;
}

interface RawBlock {
  hosts: string[];
  hostName?: string;
  user?: string;
  port?: number;
  identityFile?: string;
}

function parseRawBlocks(content: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const lines = content.split(/\r?\n/);
  let current: RawBlock = { hosts: [] };

  const flush = () => {
    if (current.hosts.length > 0) {
      blocks.push({ ...current });
    }
    current = { hosts: [] };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (!match) continue;

    const key = match[1].toLowerCase();
    const value = match[2].trim().replace(/^["']|["']$/g, "");

    if (key === "host") {
      flush();
      current = { hosts: value.split(/\s+/) };
      continue;
    }

    if (current.hosts.length === 0) continue;

    switch (key) {
      case "hostname":
        current.hostName = value;
        break;
      case "user":
        current.user = value;
        break;
      case "port":
        current.port = parseInt(value, 10) || 22;
        break;
      case "identityfile":
        current.identityFile = value;
        break;
      default:
        break;
    }
  }
  flush();
  return blocks;
}

/**
 * Parses SSH config content into an array of host blocks for listing.
 * Skips Host * and wildcard-only blocks.
 */
export function parseSSHConfig(content: string): SSHConfigHost[] {
  const raw = parseRawBlocks(content);
  return raw
    .filter((b) => {
      const primary = b.hosts[0];
      return primary && primary !== "*" && !primary.includes("*") && !primary.includes("?");
    })
    .map((b) => ({
      host: b.hosts[0],
      hostName: b.hostName,
      user: b.user,
      port: b.port,
      identityFile: b.identityFile,
    }));
}

/**
 * Resolves a single host alias from config content (first matching block wins;
 * Host * blocks are used as defaults for missing values).
 */
export function resolveSSHConfigHost(content: string, alias: string): SSHConfigHost | null {
  const raw = parseRawBlocks(content);
  let defaults: Partial<RawBlock> = {};
  for (const block of raw) {
    const isWild = block.hosts.some((h) => h === "*" || h.includes("*") || h.includes("?"));
    if (isWild) {
      defaults = { ...defaults, ...block };
      continue;
    }
    if (block.hosts.includes(alias)) {
      return {
        host: alias,
        hostName: block.hostName ?? defaults.hostName,
        user: block.user ?? defaults.user,
        port: block.port ?? defaults.port ?? 22,
        identityFile: block.identityFile ?? defaults.identityFile,
      };
    }
  }
  return null;
}
