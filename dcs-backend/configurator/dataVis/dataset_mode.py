"""In-memory dataVis dataset: full workbook (raw) vs load-compliance clean subset."""

from __future__ import annotations

import threading
from typing import Any, Literal

import pandas as pd

from configurator.conf_capex_lcoe import adjust_dataframe_for_request
from configurator.dataVis.loader import get_active_waco_load_mw, load_martin_dataframe

LOAD_COMPLIANCE_COL = "Annual Load Compliance (%)"
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
    """Active Martin study dataframe, with project LCOE scaled to this request's wheels."""
    df = load_martin_dataframe(load_mw=get_active_waco_load_mw())
    return adjust_dataframe_for_request(df, get_active_waco_load_mw())


def filter_load_compliance_clean(full: pd.DataFrame) -> pd.DataFrame:
    """Rows with annual load compliance at or above the clean threshold."""
    if LOAD_COMPLIANCE_COL not in full.columns:
        return full.copy()
    col = pd.to_numeric(full[LOAD_COMPLIANCE_COL], errors="coerce")
    return full.loc[col >= CLEAN_MIN_LOAD_COMPLIANCE].copy()


_filter_clean = filter_load_compliance_clean


def set_dataset_mode(mode: str) -> dict[str, Any]:
    """UI clean/original toggle — same on-disk dataset; mode is kept for API compatibility."""
    global _mode, _clean_df, _clean_df_tier
    normalized: DatasetMode = "clean" if mode == "clean" else "raw"
    active = get_active_waco_load_mw()
    with _lock:
        _clean_df = None
        _clean_df_tier = None
        _mode = normalized
        df = load_martin_dataframe(load_mw=active, force_reload=False)
        row_count = len(df)
        return {
            "mode": _mode,
            "row_count": row_count,
            "clean_min_load_compliance": CLEAN_MIN_LOAD_COMPLIANCE,
            "load_compliance_column": LOAD_COMPLIANCE_COL,
            "pre_cleaned_on_disk": True,
        }
