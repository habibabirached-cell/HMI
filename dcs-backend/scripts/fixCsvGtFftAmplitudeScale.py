#!/usr/bin/env python3
"""
Legacy helper: baseline Csv_gt FFT uses 0-100 scale (same as BESS/STATCOM charts).
Do not divide by 100 unless you intentionally migrate to fraction storage.
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
    from simulation_parquet_bundle import read_bundle_dataframe

    df = read_bundle_dataframe(DESIGN_DIR, "Csv_gt")
    amp = pd.to_numeric(df["Amplitude"], errors="coerce")
    print(f"Csv_gt: peak {float(amp.max()):.4f} (no change; backup scale preserved)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
