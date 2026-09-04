#!/usr/bin/env python3
"""Create ideum05: Ideum-only touch components (not regular schematic blocks)."""

from __future__ import annotations

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS = os.path.join(ROOT, "designs")
SRC = os.path.join(DESIGNS, "statcom05", "statcom05.conf.json")
DST_DIR = os.path.join(DESIGNS, "ideum05")
DST = os.path.join(DST_DIR, "ideum05.conf.json")

REMOTE_PROFILE = {
    "enabled": True,
    "commands": {
        "add8Turbines": {
            "label": "No Bess No Statcom",
            "presetName": "noBessNoStatcom",
            "targetType": "ensemble",
            "ensembleId": "all",
        },
        "addStatcomAndGFMe": {
            "label": "With Bess and StatCom",
            "presetName": "withBessandStatCom",
            "targetType": "ensemble",
            "ensembleId": "all",
        },
        "addBessOnly": {
            "label": "With BESS Alone",
            "presetName": "withBessAlone",
            "targetType": "ensemble",
            "ensembleId": "all",
        },
        "addGfmeOnly": {
            "label": "With STATCOM Alone",
            "presetName": "withStatcomAlone",
            "targetType": "ensemble",
            "ensembleId": "all",
        },
    },
}


def build_ideum05_conf() -> dict:
    return {
        "name": "Ideum05",
        "description": "Ideum touch table — Ideum-only components, side drawers hidden.",
        "ideumKioskMode": True,
        "canvasComponents": [
            {
                "id": "comp-ideum-turbine-btn",
                "type": "ideum-turbine-button",
                "name": "Add 8 turbine",
                "fullName": "Add 8 turbine",
                "position": {"x": 80, "y": 120},
                "status": "online",
                "properties": {
                    "title": "Add 8 turbine",
                    "ideumCommand": "add8Turbines",
                },
                "visualOverrides": {"width": 720, "height": 480},
                "state": {
                    "power": 0,
                    "voltage": 13.8,
                    "current": 0,
                    "frequency": 60,
                },
                "isTripped": False,
            },
            {
                "id": "comp-ideum-bess-only-btn",
                "type": "ideum-bess-button",
                "name": "Add BESS only",
                "fullName": "Add BESS only",
                "position": {"x": 80, "y": 640},
                "status": "online",
                "properties": {
                    "title": "Add BESS only",
                    "ideumCommand": "addBessOnly",
                },
                "visualOverrides": {"width": 720, "height": 380},
                "state": {
                    "power": 0,
                    "voltage": 34.5,
                    "current": 0,
                    "frequency": 60,
                },
                "isTripped": False,
            },
            {
                "id": "comp-ideum-bess-gfme-btn",
                "type": "ideum-bess-gfme-button",
                "name": "Add BESS and GFMe",
                "fullName": "Add BESS and GFMe",
                "position": {"x": 900, "y": 120},
                "status": "online",
                "properties": {
                    "title": "Add BESS and GFMe",
                    "ideumCommand": "addStatcomAndGFMe",
                },
                "visualOverrides": {"width": 1080, "height": 420},
                "state": {
                    "power": 0,
                    "voltage": 34.5,
                    "current": 0,
                    "frequency": 60,
                },
                "isTripped": False,
            },
            {
                "id": "comp-ideum-gfme-only-btn",
                "type": "ideum-gfme-button",
                "name": "ADD GFMe only",
                "fullName": "ADD GFMe only",
                "position": {"x": 900, "y": 580},
                "status": "online",
                "properties": {
                    "title": "ADD GFMe only",
                    "ideumCommand": "addGfmeOnly",
                },
                "visualOverrides": {"width": 1080, "height": 380},
                "state": {
                    "power": 0,
                    "voltage": 34.5,
                    "current": 0,
                    "frequency": 60,
                },
                "isTripped": False,
            },
        ],
        "connections": [],
        "systemState": {
            "simulationRunning": False,
            "zoom": 0.88,
            "pan": {"x": 40, "y": 60},
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
        "remoteControlTarget": {
            "designDir": "statcom05",
            "designName": "Statcom05",
        },
    }


def main() -> int:
    conf = build_ideum05_conf()

    os.makedirs(DST_DIR, exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(conf, f, indent=2)
    print(f"Wrote {DST}")

    if os.path.isfile(SRC):
        with open(SRC, "r", encoding="utf-8") as f:
            statcom = json.load(f)
        if statcom.get("remoteControlProfile") != REMOTE_PROFILE:
            statcom["remoteControlProfile"] = REMOTE_PROFILE
            with open(SRC, "w", encoding="utf-8") as f:
                json.dump(statcom, f, indent=2)
            print(f"Updated remoteControlProfile in {SRC}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
