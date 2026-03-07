#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.Trueears"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
DESKTOP_FILE="${DESKTOP_DIR}/${APP_ID}.desktop"
ICON_PATH="${REPO_ROOT}/backend/icons/icon.png"
EXEC_PATH="${REPO_ROOT}/backend/target/debug/Trueears"

mkdir -p "${DESKTOP_DIR}"

cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Type=Application
Name=Trueears
Comment=Minimalist AI dictation
Exec=${EXEC_PATH}
Icon=${ICON_PATH}
Terminal=false
Categories=Utility;
StartupNotify=true
StartupWMClass=Trueears
X-Flatpak=${APP_ID}
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${DESKTOP_DIR}" >/dev/null 2>&1 || true
fi
