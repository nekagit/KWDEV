#!/bin/bash
# Run terminal agent: single run, cd to project, run agent with prompt from file.
# Used for: "Run terminal agent to fix" (prompt from data/prompts/workflows/fix-bug.prompt.md + pasted logs), Setup prompt, temp ticket (ideas, analyze, etc.).
# Not used for Implement All (see implement_all.sh).

set -e

usage() {
    echo "Usage: $0 -P /path/to/project -F /path/to/prompt.txt [-M mode]"
    echo "  -P /path   Project root (required)."
    echo "  -F file    Prompt file (required)."
    echo "  -M mode    Cursor CLI mode: ask | plan | debug (optional; default = normal agent)."
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

# Read prompt while still in initial cwd (absolute path); avoids read failure after cd (e.g. sandbox/volume).
PROMPT_CONTENT=$(cat "$PROMPT_FILE")
rm -f "$PROMPT_FILE"
ESCAPED=$(printf '%s' "$PROMPT_CONTENT" | sed 's/\\/\\\\/g; s/"/\\"/g')

echo "Run terminal agent (single run)"
echo "Project: $PROJECT_PATH"
echo "cd $PROJECT_PATH"
cd "$PROJECT_PATH" || exit 1
echo "  → $(pwd)"
echo ""

# Cursor CLI: binary may be 'agent' or 'cursor-agent' (e.g. in ~/.local/bin)
AGENT_CMD=""
for cmd in agent cursor-agent; do
    if command -v "$cmd" >/dev/null 2>&1; then
        AGENT_CMD="$cmd"
        break
    fi
done
if [ -z "$AGENT_CMD" ]; then
    # #region agent log
    SESSION_LOG="/Users/nenadkalicanin/Documents/KW/Products/KWDEV/.cursor/debug-9c7649.log"
    W_AGENT=$(command -v agent 2>/dev/null || echo "")
    W_CUR=$(command -v cursor-agent 2>/dev/null || echo "")
    PATH_SAFE=$(printf '%s' "$PATH" | tr '\n' ' ' | sed 's/"/\\"/g')
    HAS_LOCAL=$([ -x "$HOME/.local/bin/agent" ] && echo "true" || echo "false")
    HAS_USR_LOCAL=$([ -x "/usr/local/bin/agent" ] && echo "true" || echo "false")
    HAS_LOCAL_CUR=$([ -x "$HOME/.local/bin/cursor-agent" ] && echo "true" || echo "false")
    printf '%s\n' "{\"sessionId\":\"9c7649\",\"location\":\"run_terminal_agent.sh:cli-not-found\",\"message\":\"Cursor CLI not found\",\"data\":{\"PATH\":\"${PATH_SAFE}\",\"which_agent\":\"${W_AGENT}\",\"which_cursor_agent\":\"${W_CUR}\",\"HOME\":\"${HOME:-}\",\"has_local_bin_agent\":${HAS_LOCAL},\"has_usr_local_agent\":${HAS_USR_LOCAL},\"has_local_bin_cursor_agent\":${HAS_LOCAL_CUR}},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H2\"}" >> "$SESSION_LOG" 2>/dev/null || true
    # #endregion
    echo "[stderr] Cursor CLI not found (looked for 'agent' and 'cursor-agent'). Install: curl https://cursor.com/install -fsS | bash"
    echo "[stderr] This app adds ~/.local/bin and /usr/local/bin to PATH; ensure the CLI is in one of those or on your PATH."
    exit 127
fi

# #region agent log (optional; must not affect script exit code when set -e is on)
debug_log() { [ -n "$PROJECT_PATH" ] && [ -d "$(dirname "${DEBUG_LOG:-}")" ] && { printf '%s\n' "$1" >> "$DEBUG_LOG" 2>/dev/null || true; } || true; }
DEBUG_LOG="${PROJECT_PATH}/.cursor/debug-415745.log"
debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:pre-run\",\"message\":\"script about to run agent\",\"data\":{\"MODE\":\"$MODE\",\"AGENT_CMD\":\"$AGENT_CMD\",\"prompt_len\":${#ESCAPED},\"PROJECT_PATH\":\"$PROJECT_PATH\"},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H3\"}"
# #endregion
mkdir -p "${PROJECT_PATH}/.cursor"
AGENT_OUTPUT_FILE="${PROJECT_PATH}/.cursor/agent_output_415745.txt"
AGENT_STDERR_FILE="${PROJECT_PATH}/.cursor/agent_stderr_415745.txt"
# #region agent log - test agent binary
AGENT_VERSION=$("$AGENT_CMD" --version 2>&1 || echo "version_failed")
AGENT_WHICH=$(which "$AGENT_CMD" 2>&1 || echo "which_failed")
# Test if Cursor is reachable with a simple prompt (correct syntax: --print, prompt as positional arg)
AGENT_TEST=$("$AGENT_CMD" --print "say hi" 2>&1 | head -c 200 || echo "test_failed")
debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:agent-check\",\"message\":\"agent binary info\",\"data\":{\"AGENT_VERSION\":\"$(echo "$AGENT_VERSION" | tr '\n' ' ' | tr '"' "'")\",\"AGENT_WHICH\":\"$AGENT_WHICH\",\"AGENT_TEST\":\"$(echo "$AGENT_TEST" | tr '\n' ' ' | tr '"' "'")\"},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H1\"}"
# #endregion
# Log prompt length and first/last chars for debugging
PROMPT_FIRST=$(echo "$ESCAPED" | head -c 100 | tr '\n' ' ' | tr '"' "'")
PROMPT_LAST=$(echo "$ESCAPED" | tail -c 100 | tr '\n' ' ' | tr '"' "'")
debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:prompt-debug\",\"message\":\"prompt content check\",\"data\":{\"prompt_len\":${#ESCAPED},\"prompt_first\":\"$PROMPT_FIRST\",\"prompt_last\":\"$PROMPT_LAST\"},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H3\"}"
# Safe display of real prompt for "Running:" line (truncate long prompts, escape quotes for echo)
PROMPT_DISPLAY=$(printf '%s' "$PROMPT_CONTENT" | head -c 500 | tr '\n' ' ' | sed 's/"/\\"/g')
[ ${#PROMPT_CONTENT} -gt 500 ] && PROMPT_DISPLAY="$PROMPT_DISPLAY..."
if [ -n "$MODE" ]; then
    echo "Running: $AGENT_CMD --mode=$MODE --print --trust \"$PROMPT_DISPLAY\""
    debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:with-mode\",\"message\":\"invoking agent with mode\",\"data\":{\"MODE\":\"$MODE\",\"AGENT_CMD\":\"$AGENT_CMD\"},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H2\"}"
    # Correct CLI usage: --print (non-interactive), --trust (trust workspace), prompt as positional arg
    "$AGENT_CMD" --mode="$MODE" --print --trust "$PROMPT_CONTENT" > "$AGENT_OUTPUT_FILE" 2> "$AGENT_STDERR_FILE" &
    AGENT_PID=$!
    debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:agent-started\",\"message\":\"agent process started\",\"data\":{\"AGENT_PID\":$AGENT_PID},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H5\"}"
    wait $AGENT_PID
    AGENT_EXIT=$?
else
    echo "Running: $AGENT_CMD --print --trust \"$PROMPT_DISPLAY\" (print mode, trust workspace)"
    "$AGENT_CMD" --print --trust "$PROMPT_CONTENT" > "$AGENT_OUTPUT_FILE" 2> "$AGENT_STDERR_FILE" &
    AGENT_PID=$!
    debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:agent-started\",\"message\":\"agent process started\",\"data\":{\"AGENT_PID\":$AGENT_PID},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H5\"}"
    wait $AGENT_PID
    AGENT_EXIT=$?
fi
# Capture output and stderr for logging
AGENT_OUTPUT_SNIPPET=$(head -c 500 "$AGENT_OUTPUT_FILE" 2>/dev/null | tr '\n' ' ' | tr '"' "'" || echo "no_stdout")
AGENT_STDERR_SNIPPET=$(head -c 500 "$AGENT_STDERR_FILE" 2>/dev/null | tr '\n' ' ' | tr '"' "'" || echo "no_stderr")
# Also print to stdout/stderr so terminal sees it
cat "$AGENT_OUTPUT_FILE" 2>/dev/null
cat "$AGENT_STDERR_FILE" >&2 2>/dev/null
debug_log "{\"sessionId\":\"415745\",\"location\":\"run_terminal_agent.sh:post-run\",\"message\":\"agent exited\",\"data\":{\"AGENT_EXIT\":$AGENT_EXIT,\"MODE\":\"$MODE\",\"stdout\":\"$AGENT_OUTPUT_SNIPPET\",\"stderr\":\"$AGENT_STDERR_SNIPPET\"},\"timestamp\":$(date +%s)000,\"hypothesisId\":\"H4\"}"
echo ""
echo "Done. Agent exited with code $AGENT_EXIT."
if [ "$AGENT_EXIT" -ne 0 ]; then
    echo "Agent failed (non-zero exit). Check [stderr] above."
fi
# Exit with agent code; explicit exit 0 so optional logging or variable expansion never cause wrong code
if [ "$AGENT_EXIT" -eq 0 ]; then
    exit 0
fi
exit "$AGENT_EXIT"
