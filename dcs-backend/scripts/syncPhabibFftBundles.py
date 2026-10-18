#!/usr/bin/env python3
"""
Canonical P2R_18 shaft-torque FFT Parquet bundles use exception ids pHabib1 / pHabib2
(not Csv_gt / Csv_mvups). Charts and ensemble configs reference these ids only.

pHabib1 — baseline GT FFT (fraction 0–1 Amplitude vs Frequency)
pHabib2 — MVUPS FFT (from data/MVUPS/FFT_mvups.csv on Csv_bs frequency grid)
"""

from __future__ import annotations

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DESIGN_DIR = os.path.join(BACKEND_DIR, "designs", "p2r_18")

PHABIB_BASELINE = "pHabib1"
PHABIB_MVUPS = "pHabib2"


def _write_sidecar(sim_name: str, display_name: str, description: str, row_count: int) -> None:
    sim_path = os.path.join(DESIGN_DIR, f"{sim_name}.sim.json")
    with open(sim_path, "w", encoding="utf-8") as fp:
        json.dump(
            {
                "display_name": display_name,
                "description": description,
                "charts_to_display": [],
                "event_markers": {},
                "data_row_count": row_count,
                "data_column_count": 2,
            },
            fp,
            indent=2,
            ensure_ascii=False,
        )
        fp.write("\n")


def clone_bundle(from_sim: str, to_sim: str, display_name: str, description: str) -> None:
    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import read_bundle_dataframe, write_bundle_from_dataframe

    df = read_bundle_dataframe(DESIGN_DIR, from_sim)
    write_bundle_from_dataframe(df, DESIGN_DIR, to_sim)
    _write_sidecar(to_sim, display_name, description, len(df))
    print(f"Cloned {from_sim} -> {to_sim} ({len(df)} rows)")


def main() -> int:
    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import bundle_exists

    if not bundle_exists(DESIGN_DIR, "Csv_gt"):
        print("ERROR: Csv_gt bundle missing; cannot seed pHabib1", file=sys.stderr)
        return 1
    if not bundle_exists(DESIGN_DIR, "Csv_mvups"):
        print("ERROR: Csv_mvups bundle missing; cannot seed pHabib2", file=sys.stderr)
        return 1

    clone_bundle(
        "Csv_gt",
        PHABIB_BASELINE,
        "pHabib1 Baseline FFT",
        "Baseline shaft torque FFT (canonical id pHabib1; replaces Csv_gt in charts)",
    )
    clone_bundle(
        "Csv_mvups",
        PHABIB_MVUPS,
        "pHabib2 MVUPS FFT",
        "MVUPS shaft torque FFT (canonical id pHabib2; replaces Csv_mvups in charts)",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
