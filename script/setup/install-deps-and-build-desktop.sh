#!/usr/bin/env bash
# Install Tauri Linux dependencies (will prompt for sudo), then build and copy to Desktop.
# On Kali: if you see 404 errors, fix repos first (see .cursor/desktop-build/README.md).
set -e
echo "Installing system dependencies (sudo required)..."
sudo apt-get update -qq || true
if ! sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libglib2.0-dev \
  libgtk-3-dev \
  libpango1.0-dev \
  libgdk-pixbuf-2.0-dev; then
  echo "apt-get install failed (e.g. Kali repo 404s). Fix repositories and retry." >&2
  exit 1
fi
if ! pkg-config --exists glib-2.0 2>/dev/null; then
  echo "Tauri build dependencies are missing (glib-2.0 not found)." >&2
  echo "Fix your distro repositories (e.g. Kali: use a working mirror and run apt update), then run this script again." >&2
  echo "See: .cursor/desktop-build/README.md" >&2
  exit 1
fi
echo "Building desktop app and copying to Desktop..."
cd "$(dirname "$0")/.."
. "$HOME/.cargo/env" 2>/dev/null || true
npm run build:desktop
echo "Done. App is in $HOME/Desktop/KWCODE/"
