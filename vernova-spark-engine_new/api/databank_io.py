"""
Databank crop helpers for FastAPI — read Aug14 sources, emit windowed CSV text.
Never thin / invent samples; crop by time only.
"""
from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Iterator, Literal, Optional

ROOT = Path(__file__).resolve().parent.parent
SRC_AUG14 = ROOT / "Databank_Aug14"
SRC_AUG12 = ROOT / "DataBank_Aug12th"
SRC_LEGACY = ROOT / "Databank"
PUBLIC = ROOT / "public" / "databank"

PRE_EVENT_S = 2.0
# Cap post window for browser safety (full sample rate inside the window).
# Include a short lead-in so dials that need "sample just before event" still work
# when a caller requests phase=post only.
POST_EVENT_S = 12.0
POST_LEAD_S = 2.0

EVENT_TIME_SEC: dict[str, dict[str, float]] = {
    "CFG1": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG2": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG3": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG4": {"SCL": 80, "ROCOF": 80, "PHJUMP": 80, "VSTEP": 80},
    "CFG5": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG6": {"SCL": 10, "ROCOF": 10, "PHJUMP": 10, "VSTEP": 10},
    "CFG7": {"SCL": 5, "ROCOF": 5, "PHJUMP": 5, "VSTEP": 5},
    "CFG8": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG9": {"SCL": 2, "ROCOF": 2, "PHJUMP": 2, "VSTEP": 2},
    "CFG10": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
    "CFG11": {"SCL": 40, "ROCOF": 40, "PHJUMP": 40, "VSTEP": 40},
}

Phase = Literal["pre", "post", "full"]


def resolve_source_root() -> Path:
    for p in (SRC_AUG14, SRC_AUG12, SRC_LEGACY):
        if p.is_dir() and any(d.is_dir() and d.name.upper().startswith("CFG") for d in p.iterdir()):
            return p
    return SRC_AUG14


def _time_col_index(header: list[str]) -> int:
    for i, h in enumerate(header):
        hl = h.strip().lower()
        if hl in ("t", "t main") or hl.startswith("t "):
            return i
    raise ValueError("No time column (t / t Main) in CSV header")


def _peek_range(path: Path) -> tuple[float, float]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(8192)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        reader = csv.reader(f, dialect)
        header = next(reader)
        t_idx = _time_col_index(header)
        t0 = None
        for row in reader:
            if len(row) <= t_idx:
                continue
            try:
                t0 = float(row[t_idx])
                break
            except ValueError:
                continue
        if t0 is None:
            raise ValueError(f"Empty CSV: {path}")
    # tail
    size = path.stat().st_size
    with path.open("rb") as fb:
        fb.seek(max(0, size - 65536))
        tail = fb.read().decode("utf-8", errors="replace")
    t1 = t0
    for line in reversed(tail.splitlines()):
        if not line.strip() or line.lower().startswith("source") or line.lower().startswith("t"):
            continue
        parts = line.split("," if "," in line else ";")
        if len(parts) <= t_idx:
            continue
        try:
            t1 = float(parts[t_idx])
            break
        except ValueError:
            continue
    return t0, t1


def pick_source_csv(cfg: str, event: str) -> Path:
    root = resolve_source_root()
    event_dir = root / cfg / event
    if not event_dir.is_dir():
        raise FileNotFoundError(f"Missing {event_dir}")
    csvs = [p for p in event_dir.iterdir() if p.suffix.lower() == ".csv"]
    if not csvs:
        raise FileNotFoundError(f"No CSV in {event_dir}")
    event_time = EVENT_TIME_SEC.get(cfg, {}).get(event)
    scored: list[tuple[int, Path]] = []
    for p in csvs:
        score = 0
        try:
            t0, t1 = _peek_range(p)
        except Exception:
            scored.append((0, p))
            continue
        if event_time is not None and t0 - 0.5 <= event_time <= t1 + 0.5:
            score += 100
        if t0 <= 1:
            score += 5
        if not p.name.lower().endswith("_backup.csv"):
            score += 2
        scored.append((score, p))
    scored.sort(key=lambda x: (-x[0], x[1].name))
    return scored[0][1]


def iter_cropped_rows(
    path: Path, event_time: float, phase: Phase
) -> Iterator[list[str]]:
    t_start = max(0.0, event_time - PRE_EVENT_S)
    t_end = event_time + POST_EVENT_S
    # post also keeps a short lead-in so Inertia (needs P just before tr) works
    post_start = max(0.0, event_time - POST_LEAD_S)
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
        reader = csv.reader(f, dialect)
        header = next(reader)
        yield header
        t_idx = _time_col_index(header)
        for row in reader:
            if len(row) <= t_idx:
                continue
            try:
                t = float(row[t_idx])
            except ValueError:
                continue
            if t < t_start - 1e-9:
                continue
            if t > t_end + 1e-9:
                continue
            if phase == "pre" and t > event_time + 1e-9:
                continue
            if phase == "post" and t < post_start - 1e-9:
                continue
            yield row


def crop_to_csv_text(cfg: str, event: str, phase: Phase) -> str:
    cfg = cfg.upper()
    event = event.upper()
    if event not in ("SCL", "ROCOF", "PHJUMP", "VSTEP"):
        raise ValueError(f"Unsupported event {event}")
    event_time = EVENT_TIME_SEC.get(cfg, {}).get(event)
    if event_time is None:
        raise KeyError(f"No event time for {cfg}/{event}")

    # Prefer pre-built static crop when present (faster for Netlify-parity)
    static = PUBLIC / cfg / f"{event}.{phase}.csv" if phase != "full" else PUBLIC / cfg / f"{event}.csv"
    if static.is_file() and static.stat().st_size > 32:
        return static.read_text(encoding="utf-8")

    src = pick_source_csv(cfg, event)
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    for row in iter_cropped_rows(src, event_time, phase):
        writer.writerow(row)
    return buf.getvalue()


def list_available() -> list[dict]:
    out = []
    for cfg, events in EVENT_TIME_SEC.items():
        for ev, t in events.items():
            out.append({"cfg": cfg, "event": ev, "event_time_s": t})
    return out
