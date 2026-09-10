#!/usr/bin/env python3
"""Create ideum06: trackpad-only Ideum design (minimal conf, no canvas blocks)."""

from __future__ import annotations

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST_DIR = os.path.join(ROOT, "designs", "ideum06")
DST = os.path.join(DST_DIR, "ideum06.conf.json")


def build_ideum06_conf() -> dict:
    return {
        "name": "Ideum06",
        "description": "Trackpad only — Maingear wall mouse control (no 3D, canvas, or simulation UI).",
        "ideumKioskMode": True,
        "ideumTrackpadOnly": True,
        "canvasComponents": [],
        "connections": [],
        "systemState": {
            "simulationRunning": False,
            "zoom": 1,
            "pan": {"x": 0, "y": 0},
            "mode": "design",
        },
        "variableDrivenPresence": [],
        "canvasBlockTypeScale": {},
        "globalSampleStep": 128,
        "perChartSampleStep": {},
        "designUiSession": {},
        "quickScenarioButtons": [],
        "hiddenDefaultQuickScenarios": [],
        "ideumControlButtons": [],
    }


def main() -> int:
    os.makedirs(DST_DIR, exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(build_ideum06_conf(), f, indent=2)
    print(f"Wrote {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
