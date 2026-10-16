"""Load and cache Waco Excel datasets (200 MW and 1 GW tiers)."""

from __future__ import annotations

import re
import threading
from typing import Any

import pandas as pd

from configurator.dataVis.derived import add_derived_columns
from configurator.dataVis.paths import (
    DATAVIS_WACO_SHEET,
    DEFAULT_WACO_LOAD_MW,
    waco_workbook_path,
)

_lock = threading.Lock()
_cache_by_load_mw: dict[int, dict[str, Any]] = {}
_active_load_mw: int = DEFAULT_WACO_LOAD_MW

# After header normalization, map tier-specific names to canonical Martin/dataVis keys.
COLUMN_ALIASES: dict[str, str] = {
    "Annual Load Compliance (%)": "Year 1 Load Compliance (%)",
    "Project LCOE ($/MWh) at default CAPEX/Fuel values": "Project LCOE ($/MWh)",
    "Project CAPEX ($ M) @ Default Value": "Project CAPEX ($ M)",
}


def normalize_excel_column_key(raw: object) -> object:
    """Strip carriage returns / newlines from Excel column titles."""
    if not isinstance(raw, str):
        return raw
    text = raw.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def _normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = [normalize_excel_column_key(c) for c in out.columns]
    renames: dict[str, str] = {}
    for alias, canonical in COLUMN_ALIASES.items():
        if alias in out.columns and canonical not in out.columns:
            renames[alias] = canonical
    if renames:
        out = out.rename(columns=renames)
    drop_unnamed = [c for c in out.columns if isinstance(c, str) and c.startswith("Unnamed:")]
    if drop_unnamed:
        out = out.drop(columns=drop_unnamed, errors="ignore")
    return out


def resolve_waco_load_mw(load_mw: int | None = None) -> int:
    tier = int(load_mw if load_mw is not None else _active_load_mw)
    if tier not in (200, 1000):
        raise ValueError(f"Unsupported Waco load tier: {tier} MW (expected 200 or 1000).")
    return tier


def get_active_waco_load_mw() -> int:
    with _lock:
        return _active_load_mw


def set_active_waco_load_mw(load_mw: int) -> int:
    global _active_load_mw
    tier = resolve_waco_load_mw(load_mw)
    with _lock:
        _active_load_mw = tier
    return tier


def _read_waco_workbook(tier: int) -> pd.DataFrame:
    path = waco_workbook_path(tier)
    if not path.is_file():
        raise FileNotFoundError(f"dataVis workbook not found: {path}")

    raw = pd.read_excel(
        path,
        sheet_name=DATAVIS_WACO_SHEET,
        engine="openpyxl",
    )
    raw = raw.dropna(how="all")
    raw = _normalize_dataframe_columns(raw)
    df = add_derived_columns(raw)
    df = df.reset_index(drop=True)
    df["dataVis_row_id"] = df.index.astype(int)
    return df


def load_waco_dataframe(load_mw: int | None = None, force_reload: bool = False) -> pd.DataFrame:
    tier = resolve_waco_load_mw(load_mw)
    with _lock:
        bucket = _cache_by_load_mw.get(tier)
        if not force_reload and bucket and "df" in bucket:
            _active_load_mw = tier
            return bucket["df"]

    # Excel I/O can take 30–90s — never hold _lock across read_excel (blocks all API threads).
    df = _read_waco_workbook(tier)
    path = waco_workbook_path(tier)
    with _lock:
        _active_load_mw = tier
        _cache_by_load_mw[tier] = {
            "df": df,
            "loaded_at": pd.Timestamp.utcnow().isoformat(),
            "workbook": path.name,
        }
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
