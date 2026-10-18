"""
P2R_18 exception: MVUPS shaft-torque FFT for charts is read from plain CSV, not Parquet/SQLite.

File: designs/p2r_18/p2r_18_mvups_fft.csv (Frequency, Amplitude; all amplitudes < 0.5).
"""

from __future__ import annotations

import os
from typing import Optional

import pandas as pd

MVUPS_FFT_CSV_NAME = "p2r_18_mvups_fft.csv"
MVUPS_FFT_SIM_ID = "Csv_mvups"


def is_p2r18_mvups_fft_csv_source(catalog_rel: str, sim_name: str) -> bool:
    if sim_name != MVUPS_FFT_SIM_ID:
        return False
    rel = (catalog_rel or "").replace("\\", "/").strip("/")
    return rel == "p2r_18" or rel.endswith("/p2r_18")


def mvups_fft_csv_path(design_dir: str) -> str:
    return os.path.join(design_dir, MVUPS_FFT_CSV_NAME)


def mvups_fft_csv_exists(design_dir: str) -> bool:
    return os.path.isfile(mvups_fft_csv_path(design_dir))


def _load_dataframe(design_dir: str) -> pd.DataFrame:
    path = mvups_fft_csv_path(design_dir)
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    df = pd.read_csv(path)
    for col in ("Frequency", "Amplitude"):
        if col not in df.columns:
            raise ValueError(f"{path} must contain column {col!r}")
    return df


def mvups_fft_csv_metadata(design_dir: str) -> tuple[list[str], int]:
    df = _load_dataframe(design_dir)
    return [str(c) for c in df.columns], len(df)


def mvups_fft_csv_project_rows(
    design_dir: str,
    columns: list[str],
    offset: int = 0,
    limit: Optional[int] = None,
) -> tuple[list[dict[str, str]], int]:
    df = _load_dataframe(design_dir)
    header = [str(c) for c in df.columns]
    missing = [c for c in columns if c not in header]
    if missing:
        raise ValueError(f"Unknown columns: {missing}")
    total = len(df)
    end = total if limit is None else min(total, offset + limit)
    slice_df = df.iloc[offset:end]
    rows: list[dict[str, str]] = []
    for _, row in slice_df.iterrows():
        rows.append({c: str(row[c]) for c in columns})
    return rows, total
