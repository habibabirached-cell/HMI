#!/usr/bin/env bash
# Writes ~/Desktop/ideum-dcs-kiosk.desktop with the correct repo path.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP="${HOME}/Desktop/ideum-dcs-kiosk.desktop"

cat > "${DESKTOP}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Ideum DCS Kiosk
Comment=Start Docker and open Data Center UI fullscreen (Ideum)
Exec=bash -lc 'cd "${REPO_ROOT}" && ./ideum-start-kiosk.sh'
Icon=applications-internet
Terminal=true
Categories=Utility;
EOF

chmod +x "${DESKTOP}" "${REPO_ROOT}/ideum-start-kiosk.sh"
echo "Created: ${DESKTOP}"
