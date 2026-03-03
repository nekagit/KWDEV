#!/bin/bash
# Run Claude Code CLI agent: single run, cd to project, run agent with prompt from file.
# Same interface as run_terminal_agent.sh (-P project, -F prompt file, -M mode) but uses Claude Code CLI.

set -e

usage() {
    echo "Usage: $0 -P /path/to/project -F /path/to/prompt.txt [-M mode]"
    echo "  -P /path   Project root (required)."
    echo "  -F file    Prompt file (required)."
    echo "  -M mode    Agent mode hint (optional; currently unused by Claude CLI)."
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

echo "Run Claude Code agent (single run)"
echo "Project: $PROJECT_PATH"
echo "cd $PROJECT_PATH"
cd "$PROJECT_PATH" || exit 1
echo "  → $(pwd)"
echo ""

PROMPT_CONTENT=$(cat "$PROMPT_FILE")
rm -f "$PROMPT_FILE"

# Find claude binary
CLAUDE_CMD=""
for cmd in claude; do
    if command -v "$cmd" >/dev/null 2>&1; then
        CLAUDE_CMD="$cmd"
        break
    fi
done
if [ -z "$CLAUDE_CMD" ]; then
    echo "[stderr] Claude Code CLI not found (looked for 'claude'). Install: https://docs.anthropic.com/en/docs/claude-code"
    echo "[stderr] Ensure the CLI is on your PATH (e.g. ~/.local/bin, /usr/local/bin)."
    exit 127
fi

# Log prompt for display (truncate long prompts)
PROMPT_DISPLAY=$(printf '%s' "$PROMPT_CONTENT" | head -c 500 | tr '\n' ' ')
[ ${#PROMPT_CONTENT} -gt 500 ] && PROMPT_DISPLAY="$PROMPT_DISPLAY..."

echo "Running: $CLAUDE_CMD --print \"$PROMPT_DISPLAY\""
echo ""

# Claude Code CLI: --print for non-interactive output, prompt as positional arg.
# Run from the project directory so Claude has full project context.
"$CLAUDE_CMD" --print "$PROMPT_CONTENT" 2>&1
CLAUDE_EXIT=$?

echo ""
echo "Done. Claude Code agent exited with code $CLAUDE_EXIT."
if [ "$CLAUDE_EXIT" -ne 0 ]; then
    echo "Agent failed (non-zero exit). Check output above."
fi
exit "$CLAUDE_EXIT"
