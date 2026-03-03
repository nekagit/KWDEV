import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import type { Contact } from "../../route";

/** Escape path for safe use inside single-quoted shell string. */
function escapeSingleQuoted(p: string): string {
  return p.replace(/'/g, "'\"'\"'");
}

/** Escape path for double-quoted shell string. */
function escapeDoubleQuoted(p: string): string {
  return p
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}

export const dynamic = "force-dynamic";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date?: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * POST /api/ai-bots/contacts/sync-telegram
 * Body: { sessionId, botPath }
 * Fetches Telegram getUpdates (using TELEGRAM_BOT_TOKEN from server .env), extracts users/chats
 * from messages, and merges them into botPath/contacts.json. Uses telegram_update_offset.txt
 * to only process new updates. Returns { synced, contacts }.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, botPath } = body as { sessionId?: string; botPath?: string };

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    const safeBot = escapeSingleQuoted(botPath.trim());
    const safeBotD = escapeDoubleQuoted(botPath.trim());

    // Read current offset (acknowledged updates)
    const offsetCmd = `cat "${safeBotD}/telegram_update_offset.txt" 2>/dev/null || echo "0"`;
    const { stdout: offsetOut } = await executeCommand(sessionId, offsetCmd);
    const offset = Math.max(0, parseInt(String(offsetOut ?? "0").trim(), 10) || 0);

    // Resolve base path for .env
    const basePath =
      botPath.includes("/agents/") || botPath.includes("/agent/")
        ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
        : botPath;
    const safeBase = escapeSingleQuoted(basePath);

    // getUpdates on server so token stays server-side; output raw JSON ($ in next line so server expands TELEGRAM_BOT_TOKEN)
    const getUpdatesCmd = `( set -a; [ -f '${safeBase}/.env' ] && . '${safeBase}/.env'; [ -f '${safeBot}/.env' ] && . '${safeBot}/.env'; set +a; curl -sS "https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/getUpdates?offset=${offset}&limit=100" )`;
    const { stdout: updatesRaw } = await executeCommand(sessionId, getUpdatesCmd);
    let updates: TelegramUpdate[] = [];
    let getUpdatesBlocked = false; // 409 Conflict or similar — zeroclaw is the getUpdates consumer
    try {
      const data = JSON.parse(updatesRaw?.trim() || "{}");
      if (data.ok === true && Array.isArray(data.result)) {
        updates = data.result;
      } else if (data.ok === false && data.description) {
        const msg = String(data.description);
        if (/conflict|409|getUpdates|webhook/i.test(msg)) {
          getUpdatesBlocked = true;
        } else {
          return NextResponse.json(
            { error: msg, telegramError: msg, contacts: [] },
            { status: 422 }
          );
        }
      }
    } catch {
      // no token or invalid response
    }

    const newContactsByNumber = new Map<string, Contact>();

    for (const u of updates) {
      const msg = u.message;
      if (!msg?.chat) continue;
      const chat = msg.chat;
      const chatIdStr = String(chat.id);
      const from = msg.from;
      const name =
        from
          ? [from.first_name, from.last_name].filter(Boolean).join(" ").trim()
          : chat.title || `Chat ${chat.id}`;
      const notes = from?.username ? `@${from.username}` : "Synced from Telegram";
      const id = `tg-${chat.id}`;
      newContactsByNumber.set(chatIdStr, {
        id,
        name: name || chatIdStr,
        number: chatIdStr,
        notes,
      });
    }

    // When zeroclaw (or another daemon) is long-polling getUpdates, the app gets 409 or no updates.
    // Fallback: extract Telegram chat IDs from zeroclaw.log (e.g. "  💬 [telegram] from 647004454: ...") and add as contacts.
    const isAgentPath = botPath.includes("/agents/") || botPath.includes("/agent/");
    if (isAgentPath && (getUpdatesBlocked || (newContactsByNumber.size === 0 && updates.length === 0))) {
      const logPath = `${safeBotD}/zeroclaw.log`;
      const extractCmd = `grep -oE '\\[telegram\\] from [0-9]+' "${logPath}" 2>/dev/null | sed 's/.*from //' | sort -u`;
      const { stdout: logIdsRaw } = await executeCommand(sessionId, extractCmd);
      const logIds = (logIdsRaw?.trim() || "").split(/\s+/).filter(Boolean);
      for (const chatIdStr of logIds) {
        if (!newContactsByNumber.has(chatIdStr)) {
          newContactsByNumber.set(chatIdStr, {
            id: `tg-${chatIdStr}`,
            name: "Telegram user",
            number: chatIdStr,
            notes: "From bot log",
          });
        }
      }
    }

    if (newContactsByNumber.size === 0 && updates.length === 0) {
      // No new contacts from getUpdates or log; return current contacts
      const catCmd = `cat "${safeBotD}/contacts.json" 2>/dev/null || echo '[]'`;
      const { stdout: contactsRaw } = await executeCommand(sessionId, catCmd);
      let contacts: Contact[] = [];
      try {
        const parsed = JSON.parse(contactsRaw?.trim() || "[]");
        contacts = Array.isArray(parsed) ? parsed : [];
      } catch {
        contacts = [];
      }
      return NextResponse.json({ synced: 0, contacts });
    }

    // Load existing contacts
    const catCmd = `cat "${safeBotD}/contacts.json" 2>/dev/null || echo '[]'`;
    const { stdout: contactsRaw } = await executeCommand(sessionId, catCmd);
    let existing: Contact[] = [];
    try {
      const parsed = JSON.parse(contactsRaw?.trim() || "[]");
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }

    // Merge: by number (Telegram chat_id). New sync overwrites name/notes for same number; keep existing id if already tg-*
    const byNumber = new Map<string, Contact>();
    for (const c of existing) {
      byNumber.set(c.number.trim(), c);
    }
    for (const [num, c] of newContactsByNumber) {
      const prev = byNumber.get(num);
      if (prev) {
        byNumber.set(num, {
          ...prev,
          name: c.name || prev.name,
          notes: c.notes || prev.notes,
        });
      } else {
        byNumber.set(num, c);
      }
    }
    const merged = Array.from(byNumber.values());

    // Save contacts.json
    const json = JSON.stringify(merged, null, 2);
    const base64 = Buffer.from(json, "utf-8").toString("base64");
    const base64Safe = base64.replace(/'/g, "'\"'\"'");
    await executeCommand(sessionId, `mkdir -p "${safeBotD}"`);
    await executeCommand(
      sessionId,
      `echo '${base64Safe}' | base64 -d > "${safeBotD}/contacts.json"`
    );

    // Save new offset so we don't re-process
    const maxUpdateId = updates.length > 0 ? Math.max(...updates.map((x) => x.update_id)) : offset;
    const newOffset = maxUpdateId + 1;
    await executeCommand(
      sessionId,
      `echo "${newOffset}" > "${safeBotD}/telegram_update_offset.txt"`
    );

    return NextResponse.json({
      synced: newContactsByNumber.size,
      contacts: merged,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync from Telegram";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
