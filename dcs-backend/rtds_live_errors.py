"""
Shared RTDS / RSCAD error text for bridge, backend, and UI.
"""

from __future__ import annotations

import os
import sys


def format_rscad_import_error(exc: Exception) -> str:
    rscad_path = os.environ.get(
        "RSCAD_BIN_PATH",
        r"C:\Program Files\RTDS\RSCAD FX 2.7\BIN\lib",
    )
    folder_ok = os.path.isdir(rscad_path)
    return (
        "RSCAD FX Python bindings failed on the Maingear RTDS bridge.\n\n"
        "The HMI does the same steps as your Socket_v2.py script:\n"
        "  import rtds.rscadfx → remote_connection() → open_case() → read W, TM, TE meters.\n\n"
        f"Import error: {exc}\n\n"
        f"Python running the bridge: {sys.executable}\n"
        f"RSCAD_BIN_PATH: {rscad_path}\n"
        f"That folder exists: {folder_ok}\n\n"
        "Fix on Maingear:\n"
        "1. Open RSCAD FX and load your case (Socket_v2.py must connect first).\n"
        "2. Stop the bridge (Ctrl+C) and restart with the Python that works for Socket_v2.py, e.g.:\n"
        "     C:/Users/GEVer/AppData/Local/Python/pythoncore-3.14-64/python.exe rtds_live_bridge.py\n"
        "3. Or set RSCAD_BIN_PATH before starting the bridge:\n"
        "     export RSCAD_BIN_PATH='C:/Program Files/RTDS/RSCAD FX 2.7/BIN/lib'\n\n"
        "When the bridge connects to RTDS you should see in its terminal:\n"
        "  Connecting to the active RSCAD FX application...\n"
        "  establishing connection to 127.0.0.1:xxxxx\n"
        "  Connected successfully!"
    )


def format_bridge_unreachable_error(url: str, exc: Exception) -> str:
    return (
        "The HMI backend (Docker) could not reach the RTDS bridge on Maingear.\n\n"
        f"Bridge WebSocket(s) tried: {url}\n"
        f"Last error: {exc}\n\n"
        "The backend does NOT talk to RSCAD directly — only the bridge on Windows does.\n\n"
        "Steps:\n"
        "1. Git Bash on Maingear — leave this running:\n"
        "     cd ~/Documents/HMI/dcs-backend\n"
        "     python rtds_live_bridge.py\n"
        "   Must show: listening on ws://0.0.0.0:8765 and RSCAD bindings OK\n"
        "2. Recreate the backend container (fixes host.docker.internal DNS):\n"
        "     cd ~/Documents/HMI\n"
        "     docker compose -f docker-compose-dev.yml up -d --force-recreate dcs-backend\n"
        "3. Open RSCAD FX with your case (same as Socket_v2.py).\n"
        "4. Click Live RTDS again.\n\n"
        "When it works, the bridge terminal prints:\n"
        "  [rtds-bridge] HMI backend connected\n"
        "  Connecting to the active RSCAD FX application...\n"
        "  Connected successfully!"
    )


def format_docker_direct_import_error(exc: Exception) -> str:
    return (
        "The HMI backend tried to load RSCAD inside Docker (Linux) — that cannot work.\n\n"
        f"Error: {exc}\n\n"
        "It should use the Windows bridge instead (rtds_live_bridge.py on port 8765).\n"
        "Restart the backend container so it picks up the latest code:\n"
        "  docker compose -f docker-compose-dev.yml up -d dcs-backend\n\n"
        "Then start the bridge on Maingear and click Live RTDS again."
    )


def format_rscad_session_error(exc: Exception) -> str:
    case_path = os.environ.get(
        "RTDS_CASE_PATH",
        r"C:\DataCenter_CustomerExpCenter\RTDS\LM2500_8units_0611\LM2500_8units\Lm2500_8units_wplayback.rtfx",
    )
    return (
        "Connected to RSCAD FX but the live meter session failed.\n\n"
        f"Error: {exc}\n\n"
        f"Case path: {case_path}\n\n"
        "Check:\n"
        "• RSCAD FX is running and the case is open\n"
        "• Runtime tab gen1_original-Tab1 has meters W, TM, TE and switches SW2, PlayBack\n"
        "• RTDS_CASE_PATH points to your .rtfx file if different from default"
    )
