#!/bin/bash
# Send a message to Telegram. Use from cron handlers that post to a channel/chat.
# Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment (e.g. from .env).
# Usage: send-telegram.sh "Your message here"
# Or:   echo "message" | send-telegram.sh
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set" >&2
  exit 1
fi
MSG="${1:-$(cat)}"
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  -d "parse_mode=HTML" \
  >/dev/null || true
