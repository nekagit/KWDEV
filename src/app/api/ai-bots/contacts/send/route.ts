import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Escape path for safe use inside single-quoted shell string (for use inside '...'). */
function escapeSingleQuoted(p: string): string {
  return p.replace(/'/g, "'\"'\"'");
}

export const dynamic = "force-dynamic";

/**
 * POST /api/ai-bots/contacts/send
 * Body: { sessionId, botPath, contactId, contactNumber, message }
 * When the bot has Telegram connected (TELEGRAM_BOT_TOKEN in .env), sends the message via Telegram
 * to the contact's number (used as Telegram chat_id). Otherwise appends to botPath/outbox.json.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, botPath, contactId, contactNumber, message } = body as {
      sessionId?: string;
      botPath?: string;
      contactId?: string;
      contactNumber?: string;
      message?: string;
    };

    if (!sessionId || !botPath || !message) {
      return NextResponse.json(
        { error: "sessionId, botPath, and message are required" },
        { status: 400 }
      );
    }

    const msg = String(message).trim();
    const chatId = (contactNumber ?? "").trim();

    // Resolve base path for .env (same as connections: base + bot)
    const basePath =
      botPath.includes("/agents/") || botPath.includes("/agent/")
        ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
        : botPath;
    const safeBase = escapeSingleQuoted(basePath);
    const safeBot = escapeSingleQuoted(botPath.trim());

    // Send via Telegram when we have a chat_id: run on server so TELEGRAM_BOT_TOKEN stays server-side
    if (chatId) {
      const b64 = Buffer.from(msg, "utf8").toString("base64").replace(/'/g, "'\"'\"'");
      const safeChatId = String(chatId).replace(/"/g, '\\"');
      const tmpFile = `/tmp/contacts_send_${Date.now()}_$$.txt`;
      const bodyFile = `/tmp/contacts_send_body_${Date.now()}_$$.txt`;
      const sendCmd = `( set -a; [ -f '${safeBase}/.env' ] && . '${safeBase}/.env'; [ -f '${safeBot}/.env' ] && . '${safeBot}/.env'; set +a; echo '${b64}' | base64 -d > "${tmpFile}"; python3 -c "import urllib.parse,sys; p=sys.argv[1]; b=sys.argv[2]; c=sys.argv[3]; open(b,'w').write('chat_id='+c+'&parse_mode=HTML&text='+urllib.parse.quote(open(p).read()))" "${tmpFile}" "${bodyFile}" "${safeChatId}"; [ -n "$TELEGRAM_BOT_TOKEN" ] && curl -sS -w "\\n%{http_code}" -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d "@${bodyFile}"; rm -f "${tmpFile}" "${bodyFile}" )`;
      const result = await executeCommand(sessionId, sendCmd);
      const out = (result.stdout ?? "").trim();
      const lines = out.split("\n").filter(Boolean);
      const lastLine = lines.pop() ?? "";
      const httpCode = /^\d{3}$/.test(lastLine) ? lastLine : "";
      const jsonOut = httpCode ? lines.join("\n").trim() : out;
      if (httpCode === "200" && jsonOut) {
        try {
          const data = JSON.parse(jsonOut);
          if (data.ok === true) {
            return NextResponse.json({
              success: true,
              message: "Message sent via Telegram.",
            });
          }
        } catch {
          // fall through to outbox
        }
      }
      // Telegram failed or no token: if we have a clear error from API, return it
      if (jsonOut) {
        try {
          const data = JSON.parse(jsonOut);
          if (data.ok === false && data.description) {
            return NextResponse.json(
              { error: `Telegram: ${data.description}` },
              { status: 400 }
            );
          }
        } catch {
          // ignore
        }
      }
    }

    // Fallback: append to outbox for bot/runner to deliver later
    const targetId = contactId ?? contactNumber ?? "";
    const entry = {
      at: new Date().toISOString(),
      contactId: targetId,
      message: msg,
    };
    const json = JSON.stringify(entry);
    const base64 = Buffer.from(json, "utf-8").toString("base64");
    const safePath = botPath
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");

    await executeCommand(sessionId, `mkdir -p "${safePath}"`);
    await executeCommand(
      sessionId,
      `(echo '${base64.replace(/'/g, "'\"'\"'")}' | base64 -d; echo) >> "${safePath}/outbox.json"`
    );

    return NextResponse.json({
      success: true,
      message: chatId
        ? "Telegram send failed; message queued in outbox for delivery."
        : "Message queued for delivery. Add contact number (Telegram chat ID) to send via Telegram.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
