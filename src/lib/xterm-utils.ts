import type { Terminal } from "@xterm/xterm";

/**
 * Returns the full scrollback + viewport content of an xterm.js terminal as plain text.
 * Uses buffer.active and getLine/translateToString.
 */
export function getXtermBufferText(term: Terminal): string {
  const buf = term.buffer.active;
  const lines: string[] = [];
  for (let i = 0; i < buf.length; i++) {
    const line = buf.getLine(i);
    if (line) lines.push(line.translateToString(true));
  }
  return lines.join("\n");
}
