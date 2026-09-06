#!/usr/bin/env python3
"""Build hd_aero design — single horizontal bus, HD/Aero above, loads below."""

from __future__ import annotations

import copy
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS = os.path.join(ROOT, "designs")
P2R_CONF = os.path.join(DESIGNS, "p2r_18", "p2r_18.conf.json")
DST_DIR = os.path.join(DESIGNS, "hd_aero")
DST_CONF = os.path.join(DST_DIR, "hd_aero.conf.json")

RIGHT_X_SHIFT = -1589
BUS_ID = "comp-bus-main"
BUS_X = -450
MIRROR_X = 150
BUS_WIDTH = 1200
PREVIEW_GAP = 4  # px between HD|Aero and Load1|Load2 collapsed 3D tiles
PREVIEW_W = (BUS_WIDTH - PREVIEW_GAP) // 2
PREVIEW_H = 375
BUS_HEIGHT = 40
# Vertical wire run between preview tile edge and bus edge (CB sits centered in this gap).
STUB_WIRE_GAP = 300
PREVIEW_TOP_Y = 40
BUS_Y = PREVIEW_TOP_Y + PREVIEW_H + STUB_WIRE_GAP
PREVIEW_BOTTOM_Y = BUS_Y + BUS_HEIGHT + STUB_WIRE_GAP
BANK_Y = PREVIEW_TOP_Y - 52
VERTICAL_BAND_MAX_Y = PREVIEW_BOTTOM_Y + PREVIEW_H + 80
BREAKER_STUB_W = 100
BREAKER_STUB_H = 130
AERO_STUB_CB_ID = "comp-aero-stub-cb"
LOAD2_STUB_CB_ID = "comp-load2-stub-cb"
LEFT_PREVIEW_X = BUS_X
RIGHT_PREVIEW_X = BUS_X + PREVIEW_W + PREVIEW_GAP

HD_AERO_WIRE_GREEN = "#2d7a32"
HD_AERO_CONN_STYLE = {
    "useAuto": False,
    "color": HD_AERO_WIRE_GREEN,
    "thickness": 5,
    "animation": "none",
    "depth3d": 38,
    "glossiness": 18,
    "shadow": {
        "blur": 4,
        "offsetX": 2,
        "offsetY": 2,
        "opacity": 0.35,
        "color": "#000000",
    },
}


def collapse_stub_breaker_position(
    preview_x: float,
    preview_y: float,
    *,
    preview_above_bus: bool,
) -> dict[str, float]:
    """Center an interactive stub CB on the vertical stub between a collapse tile and the bus."""
    bx = preview_x + PREVIEW_W / 2 - BREAKER_STUB_W / 2
    if preview_above_bus:
        edge_a = preview_y + PREVIEW_H
        edge_b = BUS_Y
    else:
        edge_a = BUS_Y + BUS_HEIGHT
        edge_b = preview_y
    by = (edge_a + edge_b) / 2 - BREAKER_STUB_H / 2
    return {"x": bx, "y": by}

CT_VERTICAL_IDS = frozenset({
    "comp-hd-ct",
    "comp-aero-ct",
    "comp-load1-ct",
    "comp-load2-ct",
})

LEFT_TURBINE_CHAIN = [
    ("comp-turbine-1", "comp-hd-turbine"),
    ("comp-gen-cb-1", "comp-hd-gen-cb"),
    ("comp-gsu-gen-1", "comp-hd-gsu"),
    ("comp-ct-gen-800-1", "comp-hd-ct"),
]

RIGHT_TURBINE_CHAIN = [
    ("comp-turbine-5", "comp-aero-turbine"),
    ("comp-gen-cb-5", "comp-aero-gen-cb"),
    ("comp-gsu-gen-5", "comp-aero-gsu"),
    ("comp-ct-gen-800-5", "comp-aero-ct"),
]

LOAD1_PREFIX = [
    ("comp-it-lt-ct", "comp-load1-ct"),
    ("comp-it-lt-xfmr", "comp-load1-xfmr"),
    ("comp-it-lt-knot", "comp-load1-knot"),
    ("comp-it-lt-aux", "comp-load1-aux"),
    ("comp-it-lt-aux-cb", "comp-load1-aux-cb"),
    ("comp-it-lt-dc-cb", "comp-load1-dc-cb"),
    ("comp-it-lt-pcs", "comp-load1-pcs"),
    ("comp-it-lt-ups", "comp-load1-ups"),
    ("comp-it-lt-rack", "comp-load1-rack"),
]

LOAD2_PREFIX = [
    ("comp-it-rb-ct", "comp-load2-ct"),
    ("comp-it-rb-xfmr", "comp-load2-xfmr"),
    ("comp-it-rb-knot", "comp-load2-knot"),
    ("comp-it-rb-aux", "comp-load2-aux"),
    ("comp-it-rb-aux-cb", "comp-load2-aux-cb"),
    ("comp-it-rb-dc-cb", "comp-load2-dc-cb"),
    ("comp-it-rb-pcs", "comp-load2-pcs"),
    ("comp-it-rb-ups", "comp-load2-ups"),
    ("comp-it-rb-rack", "comp-load2-rack"),
]

BANKS = [
    ("comp-upper-left-gen-bank", "comp-hd-gen-bank"),
    ("comp-upper-right-gen-bank", "comp-aero-gen-bank"),
]

PREVIEWS = [
    ("comp-upper-left-gen-3d-preview", "comp-hd-3d-preview"),
    ("comp-upper-right-gen-3d-preview", "comp-aero-3d-preview"),
    ("comp-upper-left-gen-aux-preview", "comp-load1-preview"),
    ("comp-upper-right-gen-aux-preview", "comp-load2-preview"),
]

SIM_REMAP = {
    "_LM2500_5": "_Aero_1",
    "_Load_4": "_Load_2",
}

# Mirrored about bus center (x=150); CTs on vertical bus drops use ct-v.
LAYOUT = {
    BUS_ID: {"x": BUS_X, "y": BUS_Y},
    "comp-hd-3d-preview": {"x": LEFT_PREVIEW_X, "y": PREVIEW_TOP_Y},
    "comp-aero-3d-preview": {"x": RIGHT_PREVIEW_X, "y": PREVIEW_TOP_Y},
    "comp-hd-turbine": {"x": -300, "y": 45},
    "comp-hd-gen-cb": {"x": -225, "y": 256},
    "comp-hd-gsu": {"x": 0, "y": 275},
    "comp-hd-ct": {"x": 75, "y": 375},
    "comp-aero-turbine": {"x": 600, "y": 50},
    "comp-aero-gen-cb": {"x": 525, "y": 256},
    "comp-aero-gsu": {"x": 300, "y": 275},
    "comp-aero-ct": {"x": 225, "y": 375},
    "comp-load1-preview": {"x": LEFT_PREVIEW_X, "y": PREVIEW_BOTTOM_Y},
    "comp-load2-preview": {"x": RIGHT_PREVIEW_X, "y": PREVIEW_BOTTOM_Y},
    "comp-load1-ct": {"x": 75, "y": 625},
    "comp-load1-xfmr": {"x": 0, "y": 775},
    "comp-load1-knot": {"x": -50, "y": 800},
    "comp-load1-aux": {"x": -100, "y": 1100},
    "comp-load1-aux-cb": {"x": -50, "y": 975},
    "comp-load1-dc-cb": {"x": -175, "y": 781},
    "comp-load1-pcs": {"x": -200, "y": 950},
    "comp-load1-ups": {"x": -200, "y": 1100},
    "comp-load1-rack": {"x": -200, "y": 1275},
    "comp-load2-ct": {"x": 225, "y": 625},
    "comp-load2-xfmr": {"x": 300, "y": 775},
    "comp-load2-knot": {"x": 350, "y": 800},
    "comp-load2-aux": {"x": 400, "y": 1100},
    "comp-load2-aux-cb": {"x": 350, "y": 975},
    "comp-load2-dc-cb": {"x": 475, "y": 781},
    "comp-load2-pcs": {"x": 500, "y": 950},
    "comp-load2-ups": {"x": 500, "y": 1100},
    "comp-load2-rack": {"x": 500, "y": 1275},
    "comp-hd-gen-bank": {"x": LEFT_PREVIEW_X, "y": BANK_Y},
    "comp-aero-gen-bank": {"x": RIGHT_PREVIEW_X, "y": BANK_Y},
    AERO_STUB_CB_ID: collapse_stub_breaker_position(
        RIGHT_PREVIEW_X, PREVIEW_TOP_Y, preview_above_bus=True
    ),
    LOAD2_STUB_CB_ID: collapse_stub_breaker_position(
        RIGHT_PREVIEW_X, PREVIEW_BOTTOM_Y, preview_above_bus=False
    ),
}


def load_p2r() -> dict:
    with open(P2R_CONF, encoding="utf-8") as f:
        return json.load(f)


def comp_by_id(data: dict) -> dict[str, dict]:
    return {c["id"]: c for c in data["canvasComponents"]}


def remap_sim_refs(obj, mapping: dict[str, str]):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "ensembleSimId" and isinstance(v, str) and v in mapping:
                obj[k] = mapping[v]
            else:
                remap_sim_refs(v, mapping)
    elif isinstance(obj, list):
        for item in obj:
            remap_sim_refs(item, mapping)


def clone_component(src: dict, new_id: str, *, shift_x: int = 0) -> dict:
    c = copy.deepcopy(src)
    c["id"] = new_id
    c["canvasPane"] = "upper"
    if shift_x and c.get("position"):
        c["position"] = {
            **c["position"],
            "x": c["position"]["x"] + shift_x,
        }
    remap_sim_refs(c, SIM_REMAP)
    return c


def shift_all_ids(obj, id_map: dict[str, str]):
    text = json.dumps(obj)
    for old, new in sorted(id_map.items(), key=lambda x: -len(x[0])):
        text = text.replace(old, new)
    return json.loads(text)


def build_id_map() -> dict[str, str]:
    id_map: dict[str, str] = {}
    for old, new in (
        LEFT_TURBINE_CHAIN
        + RIGHT_TURBINE_CHAIN
        + LOAD1_PREFIX
        + LOAD2_PREFIX
        + BANKS
        + PREVIEWS
    ):
        id_map[old] = new
    id_map["comp-bus-left"] = BUS_ID
    id_map["comp-bus-right"] = BUS_ID
    return id_map


def make_main_bus() -> dict:
    return {
        "id": BUS_ID,
        "type": "bus-hv",
        "name": "34.5kV Bus",
        "fullName": "Main Horizontal Bus 34.5kV",
        "position": {"x": BUS_X, "y": BUS_Y},
        "status": "idle",
        "properties": {"rating": 0, "voltage": 34.5, "unit": "kV"},
        "state": {"power": 0, "voltage": 34.5, "current": 0, "frequency": 60},
        "isTripped": False,
        "visualOverrides": {"width": 1200, "height": 40},
        "canvasPane": "upper",
    }


def apply_layout(components: list[dict]) -> None:
    for c in components:
        pos = LAYOUT.get(c["id"])
        if pos:
            c["position"] = dict(pos)


def make_collapse_stub_breaker(comp_id: str, position: dict[str, float]) -> dict:
    return {
        "id": comp_id,
        "type": "breaker-interactive-stub",
        "name": "CB",
        "fullName": "34.5kV interactive stub breaker (collapsed view)",
        "position": dict(position),
        "status": "idle",
        "properties": {"rating": 0, "voltage": 34.5, "unit": "", "primaryLabel": "CB"},
        "state": {"power": 0, "voltage": 34.5, "current": 0, "frequency": 60},
        "isTripped": False,
        "canvasPane": "upper",
        "visualOverrides": {"width": BREAKER_STUB_W, "height": BREAKER_STUB_H},
    }


def apply_preview_tile_sizes(components: list[dict]) -> None:
    preview_ids = {
        "comp-hd-3d-preview",
        "comp-aero-3d-preview",
        "comp-load1-preview",
        "comp-load2-preview",
    }
    for c in components:
        if c["id"] not in preview_ids:
            continue
        c["visualOverrides"] = {
            **(c.get("visualOverrides") or {}),
            "width": PREVIEW_W,
            "height": PREVIEW_H,
        }


def apply_vertical_ct_type(components: list[dict]) -> None:
    for c in components:
        if c["id"] in CT_VERTICAL_IDS:
            c["type"] = "ct-v"


def strip_connection_readouts(components: list[dict]) -> None:
    for c in components:
        c["connectionReadout"] = None


def replant_collapse_stub_breakers(components: list[dict]) -> None:
    """Recompute stub CB positions from final preview/bus layout."""
    by_id = {c["id"]: c for c in components}
    bus = by_id.get(BUS_ID)
    aero = by_id.get("comp-aero-3d-preview")
    load2 = by_id.get("comp-load2-preview")
    if not bus or not aero or not load2:
        return
    bus_y = bus["position"]["y"]
    aero_pos = aero["position"]
    load2_pos = load2["position"]
    aero_w = aero.get("visualOverrides", {}).get("width", PREVIEW_W)
    aero_h = aero.get("visualOverrides", {}).get("height", PREVIEW_H)
    load2_w = load2.get("visualOverrides", {}).get("width", PREVIEW_W)
    load2_h = load2.get("visualOverrides", {}).get("height", PREVIEW_H)
    for c in components:
        if c["id"] == AERO_STUB_CB_ID:
            c["position"] = {
                "x": aero_pos["x"] + aero_w / 2 - BREAKER_STUB_W / 2,
                "y": (aero_pos["y"] + aero_h + bus_y) / 2 - BREAKER_STUB_H / 2,
            }
        if c["id"] == LOAD2_STUB_CB_ID:
            c["position"] = {
                "x": load2_pos["x"] + load2_w / 2 - BREAKER_STUB_W / 2,
                "y": (bus_y + BUS_HEIGHT + load2_pos["y"]) / 2 - BREAKER_STUB_H / 2,
            }


def add_collapse_stub_connections(connections: list[dict]) -> None:
    stub_style = copy.deepcopy(HD_AERO_CONN_STYLE)
    stub_pairs = (
        ("comp-hd-3d-preview", None),
        ("comp-aero-3d-preview", AERO_STUB_CB_ID),
        ("comp-load1-preview", None),
        ("comp-load2-preview", LOAD2_STUB_CB_ID),
    )
    for preview_id, cb_id in stub_pairs:
        if cb_id:
            connections.append(
                {
                    "id": f"conn-{preview_id}-{cb_id}",
                    "from": preview_id,
                    "to": cb_id,
                    "type": "power",
                    "status": "idle",
                    "style": copy.deepcopy(stub_style),
                }
            )
            connections.append(
                {
                    "id": f"conn-{cb_id}-bus",
                    "from": cb_id,
                    "to": BUS_ID,
                    "type": "power",
                    "status": "idle",
                    "style": copy.deepcopy(stub_style),
                }
            )
        else:
            connections.append(
                {
                    "id": f"conn-{preview_id}-bus",
                    "from": preview_id,
                    "to": BUS_ID,
                    "type": "power",
                    "status": "idle",
                    "style": copy.deepcopy(stub_style),
                }
            )


def apply_hd_aero_wire_styles(connections: list[dict]) -> None:
    """Force all HD_Aero wires green (producer-style) in collapsed/expanded views."""
    for conn in connections:
        style = conn.get("style")
        if style:
            style["useAuto"] = False
            style["color"] = HD_AERO_WIRE_GREEN
            if "thickness" not in style:
                style["thickness"] = HD_AERO_CONN_STYLE["thickness"]
            if "animation" not in style:
                style["animation"] = HD_AERO_CONN_STYLE["animation"]
        else:
            conn["style"] = copy.deepcopy(HD_AERO_CONN_STYLE)


def normalize_connections(connections: list[dict]) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for conn in connections:
        fr, to = conn.get("from"), conn.get("to")
        if fr in ("comp-bus-left", "comp-bus-right", "comp-bus-tie-cb"):
            fr = BUS_ID
        if to in ("comp-bus-left", "comp-bus-right", "comp-bus-tie-cb"):
            to = BUS_ID
        if not fr or not to or fr == to:
            continue
        key = (fr, to)
        rev = (to, fr)
        if key in seen or rev in seen:
            continue
        seen.add(key)
        out.append({**conn, "from": fr, "to": to})
    return out


def build_hd_aero_conf(p2r: dict) -> dict:
    by_id = comp_by_id(p2r)
    id_map = build_id_map()

    hd_members = [new for _, new in LEFT_TURBINE_CHAIN + LOAD1_PREFIX]
    aero_members = [new for _, new in RIGHT_TURBINE_CHAIN + LOAD2_PREFIX]

    components: list[dict] = []

    for old, new in LEFT_TURBINE_CHAIN + LOAD1_PREFIX:
        components.append(clone_component(by_id[old], new))

    for old, new in RIGHT_TURBINE_CHAIN + LOAD2_PREFIX:
        components.append(clone_component(by_id[old], new, shift_x=RIGHT_X_SHIFT))

    components.append(make_main_bus())

    components.append(
        make_collapse_stub_breaker(
            AERO_STUB_CB_ID,
            collapse_stub_breaker_position(RIGHT_PREVIEW_X, 40, preview_above_bus=True),
        )
    )
    components.append(
        make_collapse_stub_breaker(
            LOAD2_STUB_CB_ID,
            collapse_stub_breaker_position(RIGHT_PREVIEW_X, 590, preview_above_bus=False),
        )
    )

    for old, new in PREVIEWS:
        c = clone_component(by_id[old], new, shift_x=RIGHT_X_SHIFT if "right" in old else 0)
        if new == "comp-hd-3d-preview":
            c["name"] = "HD"
            c["fullName"] = "Heavy-Duty Gas Turbine (7HA-class)"
            c["properties"] = {
                **(c.get("properties") or {}),
                "primaryLabel": "HD",
                "model3dUrl": "/models/7HA.glb",
            }
            if c.get("connectionReadout", {}).get("slots"):
                for slot in c["connectionReadout"]["slots"]:
                    if slot.get("ensembleSimId") == "_LM2500_1":
                        slot["ensembleSimId"] = "_HD_1"
                    if slot.get("ensembleSimId") == "formula":
                        slot["column"] = "_Power_HD_1"
        elif new == "comp-aero-3d-preview":
            c["name"] = "Aero1"
            c["fullName"] = "Aeroderivative LM2500"
            c["properties"] = {**(c.get("properties") or {}), "primaryLabel": "Aero1"}
            if c.get("connectionReadout", {}).get("slots"):
                for slot in c["connectionReadout"]["slots"]:
                    if slot.get("ensembleSimId") == "_LM2500_5":
                        slot["ensembleSimId"] = "_Aero_1"
        elif new == "comp-load1-preview":
            c["name"] = "Load 1"
            c["fullName"] = "Load 1"
            c["properties"] = {**(c.get("properties") or {}), "primaryLabel": "Load 1"}
        elif new == "comp-load2-preview":
            c["name"] = "Load 2"
            c["fullName"] = "Load 2"
            c["properties"] = {**(c.get("properties") or {}), "primaryLabel": "Load 2"}
        components.append(c)

    for c in components:
        if c["id"] == "comp-hd-turbine":
            c["type"] = "gas-turbine-7h"
            c["name"] = "HD"
            c["fullName"] = "Heavy-Duty Gas Turbine 7HA-class"
            if c.get("connectionReadout"):
                for slot in c["connectionReadout"].get("slots", []):
                    if slot.get("ensembleSimId") == "_LM2500_1":
                        slot["ensembleSimId"] = "_HD_1"
        if c["id"] == "comp-aero-turbine":
            c["name"] = "Aero1"
            c["fullName"] = "LM2500 Aero1"
        if c["id"] == "comp-load1-rack":
            c["name"] = "Load 1"
            c["fullName"] = "IT Rack Load 1"
        if c["id"] == "comp-load2-rack":
            c["name"] = "Load 2"
            c["fullName"] = "IT Rack Load 2"

    left_bank = clone_component(by_id["comp-upper-left-gen-bank"], "comp-hd-gen-bank")
    left_bank["name"] = "HD Gen Bank"
    left_bank["fullName"] = "HD Gen Bank"
    left_bank["properties"]["gasTurbineGroup"] = {
        "collapsed": True,
        "side": "left",
        "verticalBand": {"minY": 0, "maxY": VERTICAL_BAND_MAX_Y},
        "previewMemberId": "comp-hd-3d-preview",
        "collapseCompanionMemberId": "comp-load1-preview",
        "collapseColumnLeft": LEFT_PREVIEW_X,
        "memberIds": hd_members,
        "stubLinks": {
            "gapPx": 75,
            "busMemberId": BUS_ID,
            "leftAnchorIds": [],
            "rightAnchorIds": [],
        },
    }

    right_bank = clone_component(by_id["comp-upper-right-gen-bank"], "comp-aero-gen-bank")
    right_bank["name"] = "Aero Gen Bank"
    right_bank["fullName"] = "Aero Gen Bank"
    right_bank["properties"]["gasTurbineGroup"] = {
        "collapsed": True,
        "side": "right",
        "verticalBand": {"minY": 0, "maxY": VERTICAL_BAND_MAX_Y},
        "previewMemberId": "comp-aero-3d-preview",
        "collapseCompanionMemberId": "comp-load2-preview",
        "collapseColumnLeft": RIGHT_PREVIEW_X,
        "collapseExtraMemberIds": [AERO_STUB_CB_ID, LOAD2_STUB_CB_ID],
        "memberIds": aero_members,
        "stubLinks": {
            "gapPx": 75,
            "busMemberId": BUS_ID,
            "leftAnchorIds": [],
            "rightAnchorIds": [],
        },
    }
    components.extend([left_bank, right_bank])

    apply_layout(components)
    apply_preview_tile_sizes(components)
    replant_collapse_stub_breakers(components)
    apply_vertical_ct_type(components)
    strip_connection_readouts(components)

    keep_ids = {c["id"] for c in components}
    connections: list[dict] = []
    for conn in p2r["connections"]:
        mapped = shift_all_ids(copy.deepcopy(conn), id_map)
        fr, to = mapped.get("from"), mapped.get("to")
        if fr not in keep_ids and fr not in ("comp-bus-left", "comp-bus-right"):
            continue
        if to not in keep_ids and to not in ("comp-bus-left", "comp-bus-right"):
            continue
        connections.append(mapped)

    connections = normalize_connections(connections)

    skip_preview_bus = {
        ("comp-aero-3d-preview", BUS_ID),
        ("comp-load2-preview", BUS_ID),
        (BUS_ID, "comp-aero-3d-preview"),
        (BUS_ID, "comp-load2-preview"),
    }
    connections = [
        c
        for c in connections
        if (c.get("from"), c.get("to")) not in skip_preview_bus
    ]

    add_collapse_stub_connections(connections)
    apply_hd_aero_wire_styles(connections)

    return {
        "name": "HD_Aero",
        "description": "HD + Aero1 above a single horizontal bus; Load 1 and Load 2 below.",
        "canvasComponents": components,
        "connections": connections,
        "systemState": {
            "simulationRunning": False,
            "zoom": 0.88,
            "pan": {"x": 140, "y": -20},
            "mode": "simulation",
        },
        "variableDrivenPresence": [],
        "canvasBlockTypeScale": {},
        "globalSampleStep": 128,
        "perChartSampleStep": {},
        "designUiSession": {
            "ensembleId": "all",
            "designSectionVisibility": {
                "showUpper": True,
                "showLower": False,
                "hideBranches": [],
            },
            "designExpansion": {
                "breakersCompact": True,
                "peripheralsCompact": True,
            },
            "openCharts": [],
            "hiddenChartPanelNamedConfigs": [],
        },
        "quickScenarioButtons": [],
        "hiddenDefaultQuickScenarios": [],
        "ideumControlButtons": [],
        "remoteControlProfile": {
            "enabled": True,
            "commands": {
                "loadHdAero": {
                    "action": "loadDesign",
                    "designDir": "hd_aero",
                }
            },
            "interactiveBreakers": {
                "comp-aero-stub-cb": {
                    "simulationId": "_Aero_1",
                    "startSimulation": True,
                    "revealCharts": True,
                },
                "comp-load2-stub-cb": {
                    "simulationId": "_Load_2",
                    "startSimulation": True,
                    "revealCharts": True,
                },
            },
        },
    }


def copy_sim_stubs():
    sims = ["_HD_1", "_Aero_1", "_Load_1", "_Load_2", "_Load", "_Main"]
    src_map = {
        "_HD_1": "_LM2500_1",
        "_Aero_1": "_LM2500_5",
        "_Load_2": "_Load_4",
    }
    for sim in sims:
        src_name = src_map.get(sim, sim)
        src = os.path.join(DESIGNS, "p2r_18", f"{src_name}.sim.json")
        dst = os.path.join(DST_DIR, f"{sim}.sim.json")
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            if sim in ("_HD_1", "_Aero_1"):
                with open(dst, encoding="utf-8") as f:
                    data = json.load(f)
                if sim == "_HD_1":
                    data["display_name"] = " HD 1"
                elif sim == "_Aero_1":
                    data["display_name"] = " Aero 1"
                with open(dst, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                    f.write("\n")


def write_ensemble():
    path = os.path.join(DST_DIR, "hd_aero.ensemble.json")
    payload = {
        "version": 1,
        "ensembles": [
            {
                "id": "all",
                "display_name": "all",
                "member_simulations": ["_HD_1", "_Aero_1", "_Load_1", "_Load_2", "_Load", "_Main"],
            }
        ],
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")


def main() -> None:
    os.makedirs(DST_DIR, exist_ok=True)
    p2r = load_p2r()
    conf = build_hd_aero_conf(p2r)
    with open(DST_CONF, "w", encoding="utf-8") as f:
        json.dump(conf, f, indent=2)
        f.write("\n")
    copy_sim_stubs()
    write_ensemble()
    print(f"Wrote {DST_CONF} ({len(conf['canvasComponents'])} components, {len(conf['connections'])} connections)")


if __name__ == "__main__":
    main()
