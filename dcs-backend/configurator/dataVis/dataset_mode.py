"""In-memory dataVis dataset: full workbook (raw) vs load-compliance clean subset."""

from __future__ import annotations

import threading
from typing import Any, Literal

import pandas as pd

from configurator.dataVis.loader import load_waco_dataframe

LOAD_COMPLIANCE_COL = "Year 1 Load Compliance (%)"
CLEAN_MIN_LOAD_COMPLIANCE = 97.0

DatasetMode = Literal["raw", "clean"]

_lock = threading.Lock()
_mode: DatasetMode = "raw"
_clean_df: pd.DataFrame | None = None


def get_dataset_mode() -> DatasetMode:
    with _lock:
        return _mode


def get_datavis_dataframe() -> pd.DataFrame:
    with _lock:
        if _mode == "clean" and _clean_df is not None:
            return _clean_df
    return load_waco_dataframe()


def _filter_clean(full: pd.DataFrame) -> pd.DataFrame:
    if LOAD_COMPLIANCE_COL not in full.columns:
        return full.copy()
    col = pd.to_numeric(full[LOAD_COMPLIANCE_COL], errors="coerce")
    return full.loc[col >= CLEAN_MIN_LOAD_COMPLIANCE].copy()


def set_dataset_mode(mode: str) -> dict[str, Any]:
    global _mode, _clean_df
    normalized: DatasetMode = "clean" if mode == "clean" else "raw"
    with _lock:
        if normalized == "raw":
            _clean_df = None
            _mode = "raw"
            df = load_waco_dataframe(force_reload=True)
            row_count = len(df)
        else:
            full = load_waco_dataframe(force_reload=True)
            _clean_df = _filter_clean(full)
            _mode = "clean"
            row_count = len(_clean_df)
        return {
            "mode": _mode,
            "row_count": row_count,
            "clean_min_load_compliance": CLEAN_MIN_LOAD_COMPLIANCE,
            "load_compliance_column": LOAD_COMPLIANCE_COL,
        }
