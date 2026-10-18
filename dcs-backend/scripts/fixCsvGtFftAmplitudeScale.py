#!/usr/bin/env python3
"""
Csv_gt FFT Amplitude was stored 0–100 while Csv_mvups uses 0–1 (fraction of max torque).
Chart y-axis is “% of Maximum Torque” — both bundles should use the same fraction scale.
"""

from __future__ import annotations

import os
import sys

import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DESIGN_DIR = os.path.join(BACKEND_DIR, "designs", "p2r_18")


def main() -> int:
    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import read_bundle_dataframe, write_bundle_from_dataframe

    df = read_bundle_dataframe(DESIGN_DIR, "Csv_gt")
    amp = pd.to_numeric(df["Amplitude"], errors="coerce")
    freq = pd.to_numeric(df["Frequency"], errors="coerce")
    peak_before = float(amp.max())
    idx21 = (freq - 21).abs().idxmin()
    at21_before = float(amp.loc[idx21])

    # Heuristic: if peak >> 1, values are percent 0–100 not fraction 0–1.
    if peak_before > 3.0:
        df = df.copy()
        df["Amplitude"] = amp / 100.0
        write_bundle_from_dataframe(df, DESIGN_DIR, "Csv_gt")
        amp2 = pd.to_numeric(df["Amplitude"], errors="coerce")
        print(
            f"Csv_gt: scaled Amplitude /100 — peak {peak_before:.4f} -> {amp2.max():.4f}, "
            f"@21Hz {at21_before:.4f} -> {amp2.loc[idx21]:.4f}"
        )
    else:
        print(f"Csv_gt: already fraction scale (peak {peak_before:.4f}), no change")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
