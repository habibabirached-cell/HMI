#!/usr/bin/env python3
"""
Resample a scenario Parquet bundle onto another member's time grid (row-index alignment
for ensemble_cross_member charts). Rewrites the source bundle in place.

Default: dry-run. Pass --apply to write Parquet + update .sim.json row count.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Optional

import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)


def refresh_sim_json_shape(design_dir: str, sim_name: str, col_count: int, row_count: int) -> None:
    path = os.path.join(design_dir, f"{sim_name}.sim.json")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fp:
        doc = json.load(fp)
    doc["data_column_count"] = col_count
    doc["data_row_count"] = row_count
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(doc, fp, indent=2, ensure_ascii=False)
        fp.write("\n")


def load_time_series(design_dir: str, sim_name: str, time_column: str) -> np.ndarray:
    from simulation_parquet_bundle import read_bundle_dataframe

    df = read_bundle_dataframe(design_dir, sim_name)
    if time_column not in df.columns:
        raise ValueError(f"{sim_name}: missing time column {time_column!r}")
    t = pd.to_numeric(df[time_column], errors="coerce")
    if t.isna().any():
        raise ValueError(f"{sim_name}: non-numeric time values in {time_column!r}")
    return t.to_numpy(dtype=float)


def align_dataframe_to_reference(
    df: pd.DataFrame,
    time_column: str,
    t_ref: np.ndarray,
) -> pd.DataFrame:
    t_raw = pd.to_numeric(df[time_column], errors="coerce")
    valid = t_raw.notna()
    if not valid.all():
        df = df.loc[valid].copy()
        t_raw = t_raw.loc[valid]

    t_src = t_raw.to_numpy(dtype=float)
    if len(t_src) < 2:
        raise ValueError("Source time series too short after dropping invalid rows")
    if not np.all(np.diff(t_src) > 0):
        order = np.argsort(t_src, kind="stable")
        t_src = t_src[order]
        df = df.iloc[order].reset_index(drop=True)

    out: dict[str, pd.Series] = {}
    out[time_column] = pd.Series(t_ref, dtype=float)
    for col in df.columns:
        if col == time_column:
            continue
        y = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=float)
        if np.isnan(y).all():
            out[col] = pd.Series(np.full(len(t_ref), np.nan), dtype=float)
            continue
        # NaNs in source become NaN in output at those segments; interp still works on finite pairs.
        out[col] = pd.Series(np.interp(t_ref, t_src, y, left=y[0], right=y[-1]), dtype=float)

    return pd.DataFrame(out, columns=list(df.columns))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resample a scenario bundle onto a reference member's time grid",
    )
    parser.add_argument(
        "--design-dir",
        default=os.path.join(BACKEND_DIR, "designs", "p2r_18"),
        help="Design folder containing *.data bundles",
    )
    parser.add_argument("--source", required=True, help="Scenario to resample (rewritten in place)")
    parser.add_argument(
        "--reference",
        default="_LM2500_1",
        help="Scenario whose t column defines the output grid (default: _LM2500_1)",
    )
    parser.add_argument("--time-column", default="t", help="Time column name (default: t)")
    parser.add_argument("--apply", action="store_true", help="Write bundle and .sim.json")
    args = parser.parse_args()

    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import (  # noqa: E402
        bundle_exists,
        read_bundle_columns_row_count,
        read_bundle_dataframe,
        write_bundle_from_dataframe,
    )

    design_dir = os.path.abspath(args.design_dir)
    if not bundle_exists(design_dir, args.source):
        print(f"Missing bundle: {args.source}", file=sys.stderr)
        return 1
    if not bundle_exists(design_dir, args.reference):
        print(f"Missing reference bundle: {args.reference}", file=sys.stderr)
        return 1

    t_ref = load_time_series(design_dir, args.reference, args.time_column)
    src_cols, src_rows = read_bundle_columns_row_count(design_dir, args.source)
    df = read_bundle_dataframe(design_dir, args.source)
    aligned = align_dataframe_to_reference(df, args.time_column, t_ref)

    t_out = aligned[args.time_column].to_numpy()
    max_dt = float(np.max(np.abs(t_out - t_ref)))
    tm_col = "Tm_shaft_gt_1_12"
    spot = 1250 if len(t_ref) > 1250 else len(t_ref) - 1
    tm_msg = ""
    if tm_col in aligned.columns:
        tm_msg = f", {tm_col}[{spot}]={aligned[tm_col].iloc[spot]:.6f} at t={t_out[spot]:.3f}"

    print(
        f"{args.source}: {src_rows} rows -> {len(aligned)} rows "
        f"(reference {args.reference}, dt≈{t_ref[1]-t_ref[0]:.6f}s, max|t-t_ref|={max_dt:.3e}{tm_msg})",
    )

    if not args.apply:
        print("\nDry-run only. Re-run with --apply to rewrite the Parquet bundle.")
        return 0

    write_bundle_from_dataframe(aligned, design_dir, args.source)
    cols_after, rc = read_bundle_columns_row_count(design_dir, args.source)
    refresh_sim_json_shape(design_dir, args.source, len(cols_after), rc)
    print(f"Wrote {args.source}.data ({rc} rows, {len(cols_after)} columns) and updated .sim.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
