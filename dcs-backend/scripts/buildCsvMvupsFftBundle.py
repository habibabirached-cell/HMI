#!/usr/bin/env python3
"""Build designs/p2r_18/Csv_mvups.data from data/MVUPS/FFT_mvups.csv (131-point Csv_bs grid)."""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DESIGN_DIR = os.path.join(BACKEND_DIR, "designs", "p2r_18")
MVUPS_CSV = os.path.join(BACKEND_DIR, "data", "MVUPS", "FFT_mvups.csv")
SIM_MVUPS = "Csv_mvups"


def main() -> int:
    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import read_bundle_dataframe, write_bundle_from_dataframe

    bs = read_bundle_dataframe(DESIGN_DIR, "Csv_bs")
    f_ref = pd.to_numeric(bs["Frequency"], errors="coerce").to_numpy(dtype=float)
    mv = pd.read_csv(MVUPS_CSV)
    f_src = pd.to_numeric(mv["Frequency"], errors="coerce").to_numpy(dtype=float)
    a_src = pd.to_numeric(mv["Amplitude"], errors="coerce").to_numpy(dtype=float)
    order = np.argsort(f_src, kind="stable")
    f_src, a_src = f_src[order], a_src[order]
    amp = np.interp(f_ref, f_src, a_src, left=0.0, right=0.0)
    out = pd.DataFrame({"Frequency": f_ref, "Amplitude": amp})
    write_bundle_from_dataframe(out, DESIGN_DIR, SIM_MVUPS)
    sim_path = os.path.join(DESIGN_DIR, f"{SIM_MVUPS}.sim.json")
    with open(sim_path, "w", encoding="utf-8") as fp:
        json.dump(
            {
                "display_name": "Csv Mvups",
                "description": "MVUPS shaft torque FFT from data/MVUPS/FFT_mvups.csv",
                "charts_to_display": [],
                "event_markers": {},
                "data_row_count": len(out),
                "data_column_count": 2,
            },
            fp,
            indent=2,
            ensure_ascii=False,
        )
        fp.write("\n")
    print(f"{SIM_MVUPS}: {len(out)} rows, amp max {amp.max():.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
