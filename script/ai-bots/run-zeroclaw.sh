#!/usr/bin/env bash
# Start ZeroClaw daemon. Deploy to e.g. /var/www/ai/agents/basic/run-zeroclaw.sh.
# Usage (foreground): ./run-zeroclaw.sh
# Usage (background, one process only): ( cd /var/www/ai/agents/basic && nohup ./run-zeroclaw.sh >> zeroclaw.log 2>&1 & ); exit 0
# The subshell + exit 0 ensures the invoking shell exits so only zeroclaw remains (avoids "2 agents").
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ZEROCLAW_WORKSPACE="$DIR"
BIN="$DIR/zeroclaw/target/release/zeroclaw"
if [[ ! -x "$BIN" ]]; then
  echo "Build zeroclaw first: cd $DIR/zeroclaw && cargo build --release"
  exit 1
fi
exec "$BIN" daemon --config-dir "$DIR"
