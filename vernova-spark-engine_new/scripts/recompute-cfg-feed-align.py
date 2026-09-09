"""Compute CFG_TOP_OFFSETS + CFG_WIRE_END_X for new Display SVGs.

Feed stub is usually: <line ... x1="N" y1="Y" y2="Y"/>  (x2 omitted → 0)
"""
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(r"D:\verona-spark-engine\public\svgs\Display")
BOX_W, BOX_H = 274.0, 194.0
PAD = 8.0
CONTAINER_LEFT = 715.0
BUS_Y = 120.0


def parse_vb(text: str) -> tuple[float, float]:
    m = re.search(r'viewBox="([^"]+)"', text)
    parts = [float(x) for x in m.group(1).replace(",", " ").split()]
    return parts[2], parts[3]


def find_feed(text: str) -> tuple[float, float]:
    candidates: list[tuple[float, float]] = []  # (feedX, feedY)

    for m in re.finditer(r"<line\b[^>]*/?>", text):
        tag = m.group(0)
        attrs = {k: float(v) for k, v in re.findall(r'(x1|y1|x2|y2)="([-.\d]+)"', tag)}
        if "y1" not in attrs:
            continue
        x1 = attrs.get("x1", 0.0)
        x2 = attrs.get("x2", 0.0)
        y1 = attrs["y1"]
        y2 = attrs.get("y2", y1)
        if abs(y1 - y2) > 1.5:
            continue
        x0 = min(x1, x2)
        if x0 < 45:
            candidates.append((x0, (y1 + y2) / 2))

    for m in re.finditer(r'<polyline\b[^>]*points="([^"]+)"[^>]*/?>', text):
        pts = [
            (float(a), float(b))
            for a, b in re.findall(r"([-.\d]+)[,\s]+([-.\d]+)", m.group(1))
        ]
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            if abs(y0 - y1) <= 1.5 and min(x0, x1) < 20 and max(x0, x1) - min(x0, x1) > 5:
                candidates.append((min(x0, x1), (y0 + y1) / 2))

    if not candidates:
        raise ValueError("no feed candidate")

    # Prefer leftmost stub (incoming bus)
    candidates.sort(key=lambda c: (c[0], c[1]))
    return candidates[0]


def main() -> None:
    print("const CFG_TOP_OFFSETS: Record<string, number> = {")
    wires: dict[str, float] = {}
    for i in range(1, 14):
        name = f"CFG{i}"
        text = (ROOT / f"{name}.svg").read_text(encoding="utf-8")
        vbW, vbH = parse_vb(text)
        feedX, feedY = find_feed(text)
        scale = min(BOX_W / vbW, BOX_H / vbH)
        offX = (BOX_W - vbW * scale) / 2
        offY = (BOX_H - vbH * scale) / 2
        top = BUS_Y - (PAD + offY + feedY * scale)
        wire = CONTAINER_LEFT + PAD + offX + feedX * scale
        wires[name] = wire
        print(
            f"  {name}: {top:.1f},  // feedY={feedY:.2f}, feedX={feedX:.2f}, vb=[{vbW:.2f}x{vbH:.2f}]"
        )
    print("};")
    print("const CFG_WIRE_END_X: Record<string, number> = {")
    for name, wire in wires.items():
        print(f"  {name}: {round(wire)},")
    print("};")


if __name__ == "__main__":
    main()
