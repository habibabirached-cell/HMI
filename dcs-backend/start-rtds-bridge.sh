#!/usr/bin/env bash
# Start RTDS bridge on Maingear (Git Bash). Use the same Python as Socket_v2.py if needed.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export RSCAD_BIN_PATH="${RSCAD_BIN_PATH:-C:/Program Files/RTDS/RSCAD FX 2.7/BIN/lib}"

# Same interpreter that runs Socket_v2.py successfully on this machine
PREFERRED_PY="${RTDS_PYTHON:-/c/Users/GEVer/AppData/Local/Python/pythoncore-3.14-64/python.exe}"
if [[ -x "$PREFERRED_PY" ]]; then
  PYTHON="$PREFERRED_PY"
else
  PYTHON="${PYTHON:-python}"
fi

echo "RTDS bridge"
echo "  Python: $PYTHON"
echo "  RSCAD_BIN_PATH: $RSCAD_BIN_PATH"
echo "  WebSocket: ws://0.0.0.0:8765"
echo "  (Docker backend uses ws://host.docker.internal:8765)"
echo ""
echo "Before Live RTDS: open RSCAD FX and load your case (like Socket_v2.py)."
echo "Press Ctrl+C to stop."
echo ""

"$PYTHON" -c "import websockets" 2>/dev/null || "$PYTHON" -m pip install "websockets>=12.0"

exec "$PYTHON" rtds_live_bridge.py
