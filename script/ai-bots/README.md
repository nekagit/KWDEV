# AI Bots cron runner

Makes jobs defined in `cron/jobs.db` (per tier) run on schedule on the server.

## Quick setup (from the app)

1. Connect to your server (e.g. ubuntu-server) on the Server page.
2. Open **AI Bots** → select a tier (e.g. Basic) → **Cron** tab.
3. Click **Install cron runner**. This deploys the runner to `basePath/scripts/` and adds a crontab entry so it runs every minute.

## Manual setup (SSH)

1. Copy `run_cron_jobs.py` and `run-cron-jobs.sh` to the server, e.g. `/var/www/ai/scripts/`.
2. `chmod +x /var/www/ai/scripts/run-cron-jobs.sh`
3. Ensure `/var/www/ai/.env` (or your base path `.env`) contains:
   - `TELEGRAM_BOT_TOKEN` – for handlers that send Telegram messages
   - `TELEGRAM_CHAT_ID` – chat or channel ID to send to
4. Add to crontab: `* * * * * /var/www/ai/scripts/run-cron-jobs.sh`

## Env (including basic bot)

The runner loads **one** `.env` from the base path (e.g. `/var/www/ai/.env`) at startup. That env is used for **all** bots, including the basic bot at `/var/www/ai/agents/basic` — there is no separate basic bot `.env` required. Optional: if you add a per-bot `.env` (e.g. `/var/www/ai/agents/basic/.env`), it is loaded when running that bot’s jobs and overrides base for those keys.

## Telegram

Handlers (e.g. shell scripts) receive `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from the base path `.env` (the runner loads it before running jobs). To send a message from a script, use the Telegram API or the provided helper:

```bash
# From a handler script, after sourcing env or running under the runner:
/path/to/scripts/send-telegram.sh "Your message here"
```

## How it works

- The runner runs every minute from system cron.
- It finds all `cron/jobs.db` under the base path (e.g. `/var/www/ai`), reads enabled jobs, and for each job whose cron expression matches the current minute it runs the handler (shell command or Cursor CLI prompt) and updates `last_run` on success.
