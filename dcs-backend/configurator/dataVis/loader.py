"""Load and cache Waco 1 GW Excel dataset."""

from __future__ import annotations

import threading
from typing import Any

import pandas as pd

from configurator.dataVis.derived import add_derived_columns
from configurator.dataVis.paths import DATAVIS_WACO_SHEET, DATAVIS_WACO_XLSX

_lock = threading.Lock()
_cache: dict[str, Any] = {}


def load_waco_dataframe(force_reload: bool = False) -> pd.DataFrame:
    with _lock:
        if not force_reload and "df" in _cache:
            return _cache["df"]

        if not DATAVIS_WACO_XLSX.is_file():
            raise FileNotFoundError(f"dataVis workbook not found: {DATAVIS_WACO_XLSX}")

        raw = pd.read_excel(
            DATAVIS_WACO_XLSX,
            sheet_name=DATAVIS_WACO_SHEET,
            engine="openpyxl",
        )
        raw = raw.dropna(how="all")
        df = add_derived_columns(raw)
        df = df.reset_index(drop=True)
        df["dataVis_row_id"] = df.index.astype(int)

        _cache["df"] = df
        _cache["loaded_at"] = pd.Timestamp.utcnow().isoformat()
        return df


def column_stats(df: pd.DataFrame, column: str) -> dict[str, Any]:
    if column not in df.columns:
        return {}
    s = df[column]
    numeric = pd.api.types.is_numeric_dtype(s)
    base: dict[str, Any] = {
        "column": column,
        "dtype": str(s.dtype),
        "numeric": numeric,
        "non_null": int(s.notna().sum()),
        "null_count": int(s.isna().sum()),
    }
    if numeric:
        clean = s.dropna()
        if len(clean):
            base.update(
                {
                    "min": float(clean.min()),
                    "max": float(clean.max()),
                    "mean": float(clean.mean()),
                    "median": float(clean.median()),
                }
            )
        else:
            base.update({"min": None, "max": None, "mean": None, "median": None})
    else:
        base["unique_count"] = int(s.nunique(dropna=True))
    return base
