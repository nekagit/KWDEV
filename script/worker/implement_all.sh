#!/bin/bash
# Implement All: one run per terminal slot; prompt is built by the app from data/prompts/implement-all.prompt.md and the ticket (+ .cursor/agents when assigned).
# Usage: -P project path (required), -S 1..20 (optional slot), -F prompt file (optional; when set, runs agent -F -p "<content>").
MAX_SLOT=20

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    echo "Usage: $0 -P /path/to/project [-S 1..$MAX_SLOT] [-F file]"
    echo "  -P /path   Project root (required)."
    echo "  -S 1..$MAX_SLOT   Terminal slot (optional). Matches the split terminals in project details."
    echo "  -F file   Path to file containing prompt for agent (print mode). If set, runs agent -p \"<content>\"."
}

PROJECT_PATH=""
SLOT=""
PROMPT_FILE=""
while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        -P) shift; [ $# -gt 0 ] && PROJECT_PATH="$1" && shift ;;
        -S) shift; [ $# -gt 0 ] && SLOT="$1" && shift ;;
        -F) shift; [ $# -gt 0 ] && PROMPT_FILE="$1" && shift ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

if [ -z "$PROJECT_PATH" ] || [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: -P /path/to/project is required and must be a directory"
    usage
    exit 1
fi

if [ -n "$SLOT" ]; then
  if ! ([ "$SLOT" -ge 1 ] 2>/dev/null && [ "$SLOT" -le "$MAX_SLOT" ]); then
    echo "Error: -S must be an integer between 1 and $MAX_SLOT"
    usage
    exit 1
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Implement All – Terminal slot $SLOT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Implement All"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
echo "Project: $PROJECT_PATH"
echo "  cd into project path, then run agent."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "cd $PROJECT_PATH"
cd "$PROJECT_PATH" || exit 1
echo "  → $(pwd)"
echo ""

# Track time from start of agent until it finishes (so UI can show real duration).
START_TIME=$(date +%s)
if [ -n "$PROMPT_FILE" ] && [ -f "$PROMPT_FILE" ]; then
  PROMPT_CONTENT=$(cat "$PROMPT_FILE")
  rm -f "$PROMPT_FILE"
  ESCAPED=$(printf '%s' "$PROMPT_CONTENT" | sed 's/\\/\\\\/g; s/"/\\"/g')
  PROMPT_DISPLAY=$(printf '%s' "$PROMPT_CONTENT" | head -c 500 | tr '\n' ' ' | sed 's/"/\\"/g')
  [ ${#PROMPT_CONTENT} -gt 500 ] && PROMPT_DISPLAY="$PROMPT_DISPLAY..."
  echo "Running: agent -p \"$PROMPT_DISPLAY\" (print mode, trust workspace)"
  echo "(Output may appear when the agent finishes.)"
  agent -p "$ESCAPED"
else
  echo "Running: agent"
  echo "(Output may appear when the agent finishes.)"
  agent
fi
AGENT_EXIT=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))
if [ "$DURATION_MIN" -gt 0 ]; then
  DURATION_STR="${DURATION_MIN}m ${DURATION_SEC}s"
else
  DURATION_STR="${DURATION}s"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done. Agent exited with code $AGENT_EXIT. Duration: $DURATION_STR"
if [ "$AGENT_EXIT" -ne 0 ]; then
  echo "Agent failed (non-zero exit). Scroll up for agent output or look for [stderr] lines."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit "$AGENT_EXIT"
