"""Rewrite Display CFG labels cleanly (no letter-spacing tspans) + under icons.

Fixes corruption from bumping font-size while keeping old tspan x offsets
(e.g. Transformer → 'Tanformer', overlapping SynCon/BESS).
"""
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(r"D:\verona-spark-engine\public\svgs\Display")

NAME_MAP = {
    "Transformer": "Transformer",
    "SynchronousCondenser": "Synchronous Condenser",
    "GFMeSTATCOM": "GFMe STATCOM",
    "GFMSTATCOM": "GFM STATCOM",
    "GFLSTATCOM": "GFL STATCOM",
    "GFMBESS": "GFM BESS",
    "GFLBESS": "GFL BESS",
}

GFL_NAMES = {"GFL STATCOM", "GFL BESS"}


def plain_from_text_body(body: str) -> str:
    plain = re.sub(r"<[^>]+>", "", body)
    return re.sub(r"\s+", "", plain)


def detect_name(joined: str) -> str | None:
    for key, label in NAME_MAP.items():
        if key in joined:
            return label
    return None


def rewrite_svg(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    text = re.sub(r"font-size:\s*5px", "font-size: 7.5px", text)
    text = re.sub(r"font-size:\s*4\.5px", "font-size: 7.5px", text)
    text = re.sub(r"font-size:\s*4px", "font-size: 7px", text)

    pattern = re.compile(r"(<text)([^>]*)(>)([\s\S]*?)(</text>)")
    items = []
    for m in pattern.finditer(text):
        attrs, body = m.group(2), m.group(4)
        joined = plain_from_text_body(body)
        if joined in ("", "~"):
            continue
        name = detect_name(joined)
        if not name:
            continue
        tr = re.search(r"translate\(([-\d.]+)\s+([-\d.]+)\)", attrs)
        if not tr:
            continue
        items.append(
            {
                "start": m.start(),
                "end": m.end(),
                "x": float(tr.group(1)),
                "y": float(tr.group(2)),
                "name": name,
                "scale": re.search(r"scale\([^)]+\)", attrs),
            }
        )

    if not items:
        if text != orig:
            path.write_text(text, encoding="utf-8")
            return True
        return False

    # Plant labels (not Transformer): place under icons, no overlaps
    plant = [it for it in items if it["name"] != "Transformer"]
    plant.sort(key=lambda a: (a["y"], a["x"]))

    # Original y<30 sat above icons — treat as upper tier
    for it in plant:
        if it["y"] < 30:
            it["y"] = 42.0

    # Enforce vertical separation for nearby X (same column / plant stack)
    plant.sort(key=lambda a: (a["y"], a["x"]))
    for i in range(len(plant)):
        for j in range(i):
            dx = abs(plant[i]["x"] - plant[j]["x"])
            if dx > 45:
                continue
            gap = plant[i]["y"] - plant[j]["y"]
            if gap < 24:
                plant[i]["y"] = plant[j]["y"] + 24.0

    # Rebuild from end so offsets stay valid
    for it in sorted(items, key=lambda a: -a["start"]):
        fill = "#fafafa" if it["name"] in GFL_NAMES else "#C8FF08"
        scale = f' {it["scale"].group(0)}' if it["scale"] else ""
        new = (
            f'<text fill="{fill}" '
            f'font-family="AgencyFB-Bold, \'Agency FB\', Arial Black, sans-serif" '
            f'font-size="7.5px" font-weight="700" '
            f'transform="translate({it["x"]:.2f} {it["y"]:.2f}){scale}">'
            f'<tspan x="0" y="0">{it["name"]}</tspan></text>'
        )
        text = text[: it["start"]] + new + text[it["end"] :]

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


changed = []
for p in sorted(ROOT.glob("CFG*.svg")):
    if rewrite_svg(p):
        changed.append(p.name)
print("rewrote", len(changed), changed)
