#!/usr/bin/env bash
# Run Claude Code from home directory so it uses personal Claude Pro (works).
# This project is added with --add-dir so Claude can read/edit it.
# Use from Cursor integrated terminal or anywhere: ./script/run-claude-from-home.sh
set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd ~ && exec claude --add-dir "$PROJECT_DIR"
