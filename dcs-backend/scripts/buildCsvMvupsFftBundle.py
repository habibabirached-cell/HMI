#!/usr/bin/env python3
"""
Build P2R_18 MVUPS FFT for charts: plain CSV only (p2r_18_mvups_fft.csv).

Charts load Csv_mvups via this file, not Parquet (see p2r18_mvups_fft_csv.py).
131 points on the Csv_bs frequency grid; all amplitudes < 0.5.
"""

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
OUT_CSV = os.path.join(DESIGN_DIR, "p2r_18_mvups_fft.csv")
SIM_MVUPS = "Csv_mvups"


def main() -> int:
    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import read_bundle_dataframe

    bs = read_bundle_dataframe(DESIGN_DIR, "Csv_bs")
    f_ref = pd.to_numeric(bs["Frequency"], errors="coerce").to_numpy(dtype=float)
    mv = pd.read_csv(MVUPS_CSV)
    f_src = pd.to_numeric(mv["Frequency"], errors="coerce").to_numpy(dtype=float)
    a_src = pd.to_numeric(mv["Amplitude"], errors="coerce").to_numpy(dtype=float)
    order = np.argsort(f_src, kind="stable")
    f_src, a_src = f_src[order], a_src[order]
    amp = np.interp(f_ref, f_src, a_src, left=0.0, right=0.0)
    if float(np.max(amp)) >= 0.5:
        print(f"ERROR: MVUPS FFT max {float(np.max(amp)):.4f} >= 0.5", file=sys.stderr)
        return 1
    out = pd.DataFrame({"Frequency": f_ref, "Amplitude": amp})
    out.to_csv(OUT_CSV, index=False, float_format="%.10g")
    sim_path = os.path.join(DESIGN_DIR, f"{SIM_MVUPS}.sim.json")
    with open(sim_path, "w", encoding="utf-8") as fp:
        json.dump(
            {
                "display_name": "Csv Mvups",
                "description": "MVUPS FFT from p2r_18_mvups_fft.csv (plain text; not Parquet at runtime)",
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
    print(f"Wrote {OUT_CSV}: {len(out)} rows, amp max {amp.max():.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
