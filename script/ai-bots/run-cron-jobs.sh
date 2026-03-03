#!/bin/bash
# Run AI bot cron jobs from jobs.db. Call from crontab: * * * * * /var/www/ai/scripts/run-cron-jobs.sh
# Set AI_BOTS_BASE_PATH if your agents are not under /var/www/ai (default).
set -e
BASE="${AI_BOTS_BASE_PATH:-/var/www/ai}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$BASE/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$BASE/.env"
  set +a
fi
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"
exec python3 "$SCRIPT_DIR/run_cron_jobs.py"
