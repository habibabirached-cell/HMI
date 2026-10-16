"""In-memory dataVis dataset: full workbook (raw) vs load-compliance clean subset."""

from __future__ import annotations

import threading
from typing import Any, Literal

import pandas as pd

from configurator.dataVis.loader import get_active_waco_load_mw, load_waco_dataframe

LOAD_COMPLIANCE_COL = "Year 1 Load Compliance (%)"
CLEAN_MIN_LOAD_COMPLIANCE = 97.0

DatasetMode = Literal["raw", "clean"]

_lock = threading.Lock()
_mode: DatasetMode = "raw"
_clean_df: pd.DataFrame | None = None
_clean_df_tier: int | None = None


def get_dataset_mode() -> DatasetMode:
    with _lock:
        return _mode


def reset_datavis_mode() -> None:
    """Drop clean subset when the active Waco workbook tier changes."""
    global _mode, _clean_df, _clean_df_tier
    with _lock:
        _clean_df = None
        _clean_df_tier = None
        _mode = "raw"


def get_datavis_dataframe() -> pd.DataFrame:
    global _mode, _clean_df, _clean_df_tier
    active = get_active_waco_load_mw()
    with _lock:
        if _mode == "clean" and _clean_df is not None and _clean_df_tier == active:
            return _clean_df
        if _mode == "clean" and _clean_df is not None and _clean_df_tier != active:
            _clean_df = None
            _clean_df_tier = None
            _mode = "raw"
    return load_waco_dataframe(active)


def _filter_clean(full: pd.DataFrame) -> pd.DataFrame:
    if LOAD_COMPLIANCE_COL not in full.columns:
        return full.copy()
    col = pd.to_numeric(full[LOAD_COMPLIANCE_COL], errors="coerce")
    return full.loc[col >= CLEAN_MIN_LOAD_COMPLIANCE].copy()


def set_dataset_mode(mode: str) -> dict[str, Any]:
    global _mode, _clean_df, _clean_df_tier
    normalized: DatasetMode = "clean" if mode == "clean" else "raw"
    active = get_active_waco_load_mw()
    with _lock:
        if normalized == "raw":
            _clean_df = None
            _clean_df_tier = None
            _mode = "raw"
            df = load_waco_dataframe(active, force_reload=True)
            row_count = len(df)
        else:
            full = load_waco_dataframe(active, force_reload=True)
            _clean_df = _filter_clean(full)
            _clean_df_tier = active
            _mode = "clean"
            row_count = len(_clean_df)
        return {
            "mode": _mode,
            "row_count": row_count,
            "clean_min_load_compliance": CLEAN_MIN_LOAD_COMPLIANCE,
            "load_compliance_column": LOAD_COMPLIANCE_COL,
        }
