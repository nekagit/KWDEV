/**
 * Export keyboard shortcuts as text or file for download/copy. Used by command palette and Configuration.
 */
import type { ShortcutGroup } from "@/data/keyboard-shortcuts";
import { KEYBOARD_SHORTCUT_GROUPS } from "@/data/keyboard-shortcuts";
import { toast } from "sonner";
import { filenameTimestamp, triggerFileDownload } from "@/lib/download-helpers";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Format keyboard shortcut groups as plain text (for clipboard).
 * Format: group title, then "Keys\tDescription" lines per shortcut.
 */
export function formatKeyboardShortcutsAsPlainText(
  groups: ShortcutGroup[] = KEYBOARD_SHORTCUT_GROUPS
): string {
  const lines: string[] = [];
  for (const group of groups) {
    lines.push(group.title);
    lines.push("");
    for (const entry of group.shortcuts) {
      lines.push(`${entry.keys}\t${entry.description}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * Format keyboard shortcut groups as Markdown.
 * Format: # title per group, then table | Keys | Action |
 */
export function formatKeyboardShortcutsAsMarkdown(
  groups: ShortcutGroup[] = KEYBOARD_SHORTCUT_GROUPS
): string {
  const lines: string[] = [
    "# Keyboard shortcuts",
    "",
    `Exported: ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];
  for (const group of groups) {
    lines.push(`## ${group.title}`);
    lines.push("");
    lines.push("| Keys | Action |");
    lines.push("| --- | --- |");
    for (const entry of group.shortcuts) {
      const keys = entry.keys.replace(/\|/g, "\\|");
      const desc = entry.description.replace(/\|/g, "\\|");
      lines.push(`| ${keys} | ${desc} |`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/**
 * Download the keyboard shortcuts list as a Markdown file.
 * Filename: keyboard-shortcuts-YYYY-MM-DD-HHmm.md
 */
export function downloadKeyboardShortcutsAsMarkdown(): void {
  const markdown = formatKeyboardShortcutsAsMarkdown();
  const filename = `keyboard-shortcuts-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("Keyboard shortcuts exported as Markdown");
}

/**
 * Copy the keyboard shortcuts list to the clipboard as Markdown.
 * Same format as downloadKeyboardShortcutsAsMarkdown: # Keyboard shortcuts, then per-group tables.
 */
export async function copyKeyboardShortcutsAsMarkdownToClipboard(): Promise<boolean> {
  const markdown = formatKeyboardShortcutsAsMarkdown();
  return copyTextToClipboard(markdown);
}

/** JSON payload for keyboard shortcuts export (exportedAt + groups with title and shortcuts). */
export type KeyboardShortcutsJsonPayload = {
  exportedAt: string;
  groups: { title: string; shortcuts: { keys: string; description: string }[] }[];
};

/**
 * Build a JSON-serializable payload for keyboard shortcuts.
 * Same structure as KEYBOARD_SHORTCUT_GROUPS with an exportedAt timestamp.
 */
export function buildKeyboardShortcutsJsonPayload(
  groups: ShortcutGroup[] = KEYBOARD_SHORTCUT_GROUPS
): KeyboardShortcutsJsonPayload {
  return {
    exportedAt: new Date().toISOString(),
    groups: groups.map((g) => ({
      title: g.title,
      shortcuts: g.shortcuts.map((s) => ({ keys: s.keys, description: s.description })),
    })),
  };
}

/**
 * Download the keyboard shortcuts list as a JSON file.
 * Filename: keyboard-shortcuts-YYYY-MM-DD-HHmm.json
 */
export function downloadKeyboardShortcutsAsJson(): void {
  const payload = buildKeyboardShortcutsJsonPayload();
  const json = JSON.stringify(payload, null, 2);
  const filename = `keyboard-shortcuts-${filenameTimestamp()}.json`;
  triggerFileDownload(json, filename, "application/json;charset=utf-8");
  toast.success("Keyboard shortcuts exported as JSON");
}

/**
 * Copy the keyboard shortcuts list to the clipboard as pretty-printed JSON.
 * Same payload as downloadKeyboardShortcutsAsJson.
 */
export async function copyKeyboardShortcutsAsJsonToClipboard(): Promise<void> {
  const payload = buildKeyboardShortcutsJsonPayload();
  const json = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(json);
  if (ok) {
    toast.success("Keyboard shortcuts copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}

/** Escape a CSV cell: wrap in double quotes and escape " as "" if value contains comma, quote, or newline. */
function escapeCsvCell(value: string): string {
  if (!/[\n",]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Format keyboard shortcut groups as CSV.
 * Header: Group,Keys,Description. One data row per shortcut.
 */
export function formatKeyboardShortcutsAsCsv(
  groups: ShortcutGroup[] = KEYBOARD_SHORTCUT_GROUPS
): string {
  const lines: string[] = ["Group,Keys,Description"];
  for (const group of groups) {
    for (const entry of group.shortcuts) {
      const groupEsc = escapeCsvCell(group.title);
      const keysEsc = escapeCsvCell(entry.keys);
      const descEsc = escapeCsvCell(entry.description);
      lines.push(`${groupEsc},${keysEsc},${descEsc}`);
    }
  }
  return lines.join("\n");
}

/**
 * Download the keyboard shortcuts list as a CSV file.
 * Filename: keyboard-shortcuts-YYYY-MM-DD-HHmm.csv
 */
export function downloadKeyboardShortcutsAsCsv(): void {
  const csv = formatKeyboardShortcutsAsCsv();
  const filename = `keyboard-shortcuts-${filenameTimestamp()}.csv`;
  triggerFileDownload(csv, filename, "text/csv;charset=utf-8");
  toast.success("Keyboard shortcuts exported as CSV");
}

/**
 * Copy the keyboard shortcuts list to the clipboard as CSV.
 * Same format as downloadKeyboardShortcutsAsCsv.
 */
export async function copyKeyboardShortcutsAsCsvToClipboard(): Promise<boolean> {
  const csv = formatKeyboardShortcutsAsCsv();
  const ok = await copyTextToClipboard(csv);
  if (ok) {
    toast.success("Keyboard shortcuts copied as CSV");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
