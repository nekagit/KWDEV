#!/bin/bash
# Run Gemini CLI agent: single run, cd to project, run agent with prompt from stdin.
# Same interface as run_terminal_agent.sh and run_claude_agent.sh (-P project, -F prompt file, -M mode).

set -e

usage() {
    echo "Usage: $0 -P /path/to/project -F /path/to/prompt.txt [-M mode]"
    echo "  -P /path   Project root (required)."
    echo "  -F file    Prompt file (required)."
    echo "  -M mode    Agent mode hint (optional; may be unused by Gemini CLI)."
}

PROJECT_PATH=""
PROMPT_FILE=""
MODE=""
while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        -P) shift; [ $# -gt 0 ] && PROJECT_PATH="$1" && shift ;;
        -F) shift; [ $# -gt 0 ] && PROMPT_FILE="$1" && shift ;;
        -M) shift; [ $# -gt 0 ] && MODE="$1" && shift ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

if [ -z "$PROJECT_PATH" ] || [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: -P /path/to/project is required and must be a directory"
    usage
    exit 1
fi
if [ -z "$PROMPT_FILE" ] || [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: -F prompt_file is required and must exist"
    usage
    exit 1
fi

echo "Run Gemini agent (single run)"
echo "Project: $PROJECT_PATH"
echo "cd $PROJECT_PATH"
cd "$PROJECT_PATH" || exit 1
echo "  → $(pwd)"
echo ""

PROMPT_CONTENT=$(cat "$PROMPT_FILE")
rm -f "$PROMPT_FILE"

# Find Gemini CLI binary (common names: gemini, gemi)
GEMINI_CMD=""
for cmd in gemini gemi; do
    if command -v "$cmd" >/dev/null 2>&1; then
        GEMINI_CMD="$cmd"
        break
    fi
done
if [ -z "$GEMINI_CMD" ]; then
    echo "[stderr] Gemini CLI not found (looked for 'gemini', 'gemi'). Install the Gemini CLI and ensure it is on your PATH."
    echo "[stderr] See: https://ai.google.dev/ or your Gemini CLI documentation."
    exit 127
fi

# Log prompt for display (truncate long prompts)
PROMPT_DISPLAY=$(printf '%s' "$PROMPT_CONTENT" | head -c 500 | tr '\n' ' ')
[ ${#PROMPT_CONTENT} -gt 500 ] && PROMPT_DISPLAY="$PROMPT_DISPLAY..."

echo "Running: $GEMINI_CMD (prompt from stdin, ${#PROMPT_CONTENT} chars)"
echo ""

# Pass prompt via stdin; many Gemini CLIs accept prompt on stdin when no args given.
printf '%s' "$PROMPT_CONTENT" | "$GEMINI_CMD" 2>&1
GEMINI_EXIT=${PIPESTATUS[1]:-$?}

echo ""
echo "Done. Gemini agent exited with code $GEMINI_EXIT."
if [ "$GEMINI_EXIT" -ne 0 ]; then
    echo "Agent failed (non-zero exit). Check output above."
fi
exit "$GEMINI_EXIT"
