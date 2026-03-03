import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parseDotEnv } from "@/lib/zeroclaw-parser";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/** Safe connection info we expose to the client (no tokens or secrets). */
export interface TelegramConnection {
  type: "telegram";
  username: string;
  id: number;
  first_name: string;
  is_bot: boolean;
}

export interface SlackConnection {
  type: "slack";
  team?: string;
  team_id?: string;
  user?: string;
  user_id?: string;
  url?: string;
}

export interface DiscordConnection {
  type: "discord";
  username: string;
  id: string;
  discriminator?: string;
}

export interface ConnectionEntry {
  type: "telegram" | "slack" | "discord" | "configured";
  name: string;
  connected: boolean;
  details?: TelegramConnection | SlackConnection | DiscordConnection;
  /** When we have keys set but could not resolve (e.g. invalid token). */
  error?: string;
}

/**
 * GET /api/ai-bots/connections?sessionId=...&botPath=...
 * Returns which integrations are connected and safe, public info (e.g. Telegram bot username).
 * Tokens are read on the server and used only for provider API calls; never returned to the client.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    // When botPath is an agent subfolder (e.g. /var/www/ai/agents/basic), Telegram/Slack/Discord
    // are often set in the base path .env (e.g. /var/www/ai/.env). Read both and merge (bot overrides base).
    const basePath =
      botPath.includes("/agents/") || botPath.includes("/agent/")
        ? botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai"
        : null;
    const baseEnv: Record<string, string> = {};
    if (basePath && basePath !== botPath) {
      try {
        const escapedBase = basePath.replace(/"/g, '\\"');
        const { stdout: baseEnvText } = await executeCommand(
          sessionId,
          `cat "${escapedBase}/.env" 2>/dev/null || echo ''`
        );
        if (baseEnvText.trim()) {
          Object.assign(baseEnv, parseDotEnv(baseEnvText));
        }
      } catch {
        // ignore
      }
    }

    let botEnv: Record<string, string> = {};
    try {
      const escapedBot = botPath.replace(/"/g, '\\"');
      const { stdout: envText } = await executeCommand(
        sessionId,
        `cat "${escapedBot}/.env" 2>/dev/null || echo ''`
      );
      if (envText.trim()) {
        botEnv = parseDotEnv(envText);
      }
    } catch {
      // ignore
    }

    const env = { ...baseEnv, ...botEnv };

    const connections: ConnectionEntry[] = [];

    // Telegram: getMe (username, id, first_name)
    const telegramToken = env.TELEGRAM_BOT_TOKEN?.trim();
    if (telegramToken) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${telegramToken}/getMe`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.ok && data.result) {
          const r = data.result;
          connections.push({
            type: "telegram",
            name: "Telegram",
            connected: true,
            details: {
              type: "telegram",
              username: r.username || "",
              id: r.id,
              first_name: r.first_name || "",
              is_bot: !!r.is_bot,
            },
          });
        } else {
          connections.push({
            type: "configured",
            name: "Telegram",
            connected: true,
            error: data.description || "Token invalid or expired",
          });
        }
      } catch (err) {
        connections.push({
          type: "configured",
          name: "Telegram",
          connected: true,
          error: (err as Error).message || "Could not verify bot",
        });
      }
    }

    // Slack: auth.test (team, user, url)
    const slackToken = env.SLACK_BOT_TOKEN?.trim() || env.SLACK_TOKEN?.trim();
    if (slackToken) {
      try {
        const res = await fetch("https://slack.com/api/auth.test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${slackToken}`,
          },
          body: "{}",
          cache: "no-store",
        });
        const data = await res.json();
        if (data.ok) {
          connections.push({
            type: "slack",
            name: "Slack",
            connected: true,
            details: {
              type: "slack",
              team: data.team,
              team_id: data.team_id,
              user: data.user,
              user_id: data.user_id,
              url: data.url,
            },
          });
        } else {
          connections.push({
            type: "configured",
            name: "Slack",
            connected: true,
            error: data.error || "Token invalid or expired",
          });
        }
      } catch (err) {
        connections.push({
          type: "configured",
          name: "Slack",
          connected: true,
          error: (err as Error).message || "Could not verify",
        });
      }
    }

    // Discord: GET /users/@me with bot token
    const discordToken = env.DISCORD_BOT_TOKEN?.trim() || env.DISCORD_TOKEN?.trim();
    if (discordToken) {
      try {
        const authToken = discordToken.startsWith("Bot ") ? discordToken : `Bot ${discordToken}`;
        const res = await fetch("https://discord.com/api/v10/users/@me", {
          headers: {
            Authorization: authToken,
          },
          cache: "no-store",
        });
        const data = await res.json();
        if (data.id && !data.code) {
          connections.push({
            type: "discord",
            name: "Discord",
            connected: true,
            details: {
              type: "discord",
              username: data.username || "",
              id: data.id,
              discriminator: data.discriminator,
            },
          });
        } else {
          connections.push({
            type: "configured",
            name: "Discord",
            connected: true,
            error: data.message || "Token invalid or expired",
          });
        }
      } catch (err) {
        connections.push({
          type: "configured",
          name: "Discord",
          connected: true,
          error: (err as Error).message || "Could not verify",
        });
      }
    }

    return NextResponse.json({ connections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
