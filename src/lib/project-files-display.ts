/**
 * Pure helpers for Project Files tab (table columns, labels).
 */
import type { FileEntry } from "@/lib/api-projects";

/** Extension from basename (lowercase), or "" if none (including `.gitignore`). */
export function parseFilenameExtension(name: string): string {
  if (!name || name === "." || name === "..") return "";
  const base = name.replace(/^.*\//, "");
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * POSIX ls-style mode string (first char + rwx for user/group/other).
 * `mode` should be the raw `st_mode` value (e.g. from Node `stats.mode` or Rust `PermissionsExt::mode()`).
 */
export function formatUnixPermissionString(
  mode: number,
  opts: { isDirectory: boolean; isSymbolicLink: boolean }
): string {
  const permBits = mode & 0o777;
  const triple = (n: number) =>
    `${n & 4 ? "r" : "-"}${n & 2 ? "w" : "-"}${n & 1 ? "x" : "-"}`;
  const u = (permBits >> 6) & 7;
  const g = (permBits >> 3) & 7;
  const o = permBits & 7;
  const first = opts.isSymbolicLink ? "l" : opts.isDirectory ? "d" : "-";
  return `${first}${triple(u)}${triple(g)}${triple(o)}`;
}

export function fileEntryKindLabel(entry: FileEntry): string {
  if (entry.isDirectory) return "Folder";
  if (entry.isSymbolicLink) return "Symlink";
  const ext = parseFilenameExtension(entry.name);
  if (!ext) return "File";
  return ext.toUpperCase();
}

export function formatEntryTimestamp(iso: string | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPermissionsCell(raw: string | undefined): string {
  if (raw === undefined || raw === "") return "—";
  return raw;
}
