#!/usr/bin/env python3
"""Create ideum05: canvas with two 3D touch buttons; header kept, side drawers hidden."""

from __future__ import annotations

import json
import os
import sys

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
    },
}

IDEUM_CONTROL_BUTTONS = [
    {
        "id": "ideum-add8turbines",
        "label": "Add 8 turbines",
        "command": "add8Turbines",
        "color": "#1565c0",
        "icon": "⚡",
        "componentIds": ["comp-ideum-turbine-3d"],
    },
    {
        "id": "ideum-add-bess-gfme",
        "label": "add both Bess and GFMe",
        "command": "addStatcomAndGFMe",
        "color": "#2e7d32",
        "icon": "🔋",
        "componentIds": ["comp-ideum-bess", "comp-ideum-gfme"],
        "grouped": True,
    },
]

PLACEHOLDER_MEMBER = "ideum-placeholder-member"


def _bank(
    bank_id: str,
    name: str,
    x: float,
    y: float,
    column_left: float,
    *,
    preview_id: str | None = None,
    extra_ids: list[str] | None = None,
) -> dict:
    g: dict = {
        "collapsed": True,
        "side": "left",
        "verticalBand": {"minY": 0, "maxY": 2000},
        "collapseColumnLeft": column_left,
        "memberIds": [PLACEHOLDER_MEMBER],
    }
    if preview_id:
        g["previewMemberId"] = preview_id
    if extra_ids:
        g["collapseExtraMemberIds"] = extra_ids
    return {
        "id": bank_id,
        "type": "gas-turbine-bank",
        "name": name,
        "fullName": name,
        "position": {"x": x, "y": y},
        "status": "online",
        "properties": {
            "rating": 0,
            "voltage": 13.8,
            "unit": "",
            "gasTurbineGroup": g,
        },
        "state": {"power": 0, "voltage": 13.8, "current": 0, "frequency": 60},
        "isTripped": False,
    }


def _turbine_3d() -> dict:
    return {
        "id": "comp-ideum-turbine-3d",
        "type": "gas-turbine-3d",
        "name": "4 Gas Turbines",
        "fullName": "Add 8 turbines",
        "position": {"x": 100, "y": 200},
        "status": "online",
        "properties": {
            "rating": 0,
            "voltage": 13.8,
            "unit": "MW",
        },
        "visualOverrides": {"width": 700, "height": 400},
        "state": {"power": 0, "voltage": 13.8, "current": 0, "frequency": 60},
        "isTripped": False,
    }


def _bess() -> dict:
    return {
        "id": "comp-ideum-bess",
        "type": "bess-50mw",
        "name": "BESS",
        "fullName": "Battery Energy Storage System 50MW",
        "position": {"x": 900, "y": 200},
        "status": "online",
        "properties": {
            "rating": 100,
            "voltage": 34.5,
            "unit": "MW",
            "ideumDecorOnly": True,
        },
        "visualOverrides": {"width": 650, "height": 360},
        "state": {
            "power": 0,
            "voltage": 34.5,
            "current": 0,
            "frequency": 60,
            "soc": 85,
        },
        "isTripped": False,
    }


def _gfme() -> dict:
    return {
        "id": "comp-ideum-gfme",
        "type": "gfme-statcom",
        "name": "GFMe STATCOM",
        "fullName": "GFME Static Synchronous Compensator",
        "position": {"x": 900, "y": 600},
        "status": "online",
        "properties": {
            "rating": 50,
            "voltage": 34.5,
            "unit": "MVAR",
            "ideumDecorOnly": True,
        },
        "visualOverrides": {"width": 650, "height": 360},
        "state": {"power": 0, "voltage": 34.5, "current": 0, "frequency": 60},
        "isTripped": False,
    }


def build_ideum05_conf() -> dict:
    return {
        "name": "Ideum05",
        "description": "Ideum touch table — two 3D canvas buttons, side drawers hidden.",
        "ideumKioskMode": True,
        "canvasComponents": [
            _bank(
                "comp-ideum-left-bank",
                "Ideum Turbines",
                100,
                80,
                100,
                preview_id="comp-ideum-turbine-3d",
            ),
            _bank(
                "comp-ideum-right-bank",
                "Ideum BESS + GFMe",
                900,
                80,
                900,
                extra_ids=["comp-ideum-bess", "comp-ideum-gfme"],
            ),
            _turbine_3d(),
            _bess(),
            _gfme(),
        ],
        "connections": [],
        "systemState": {
            "simulationRunning": False,
            "zoom": 0.9,
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
        "ideumControlButtons": IDEUM_CONTROL_BUTTONS,
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
