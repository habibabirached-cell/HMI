"""Load and cache Waco Excel datasets (200 MW and 1 GW tiers)."""

from __future__ import annotations

import re
import threading
from pathlib import Path
from typing import Any

import pandas as pd

from configurator.dataVis.derived import add_derived_columns
from configurator.dataVis.paths import (
    DATAVIS_WACO_SHEET,
    DEFAULT_WACO_LOAD_MW,
    MARTIN_STUDY_BADGER,
    MARTIN_STUDY_WACO,
    MARTIN_STUDIES,
    badger_clean_csv_path,
    badger_workbook_path,
    waco_clean_csv_path,
    waco_workbook_path,
)

_lock = threading.Lock()
_cache_by_load_mw: dict[int, dict[str, Any]] = {}
_badger_cache: dict[str, Any] | None = None
_active_load_mw: int = DEFAULT_WACO_LOAD_MW
_active_martin_study: str = MARTIN_STUDY_WACO

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


def get_active_martin_study() -> str:
    with _lock:
        return _active_martin_study


def set_active_martin_study(study: str) -> str:
    global _active_martin_study
    normalized = study if study in MARTIN_STUDIES else MARTIN_STUDY_WACO
    with _lock:
        _active_martin_study = normalized
    return normalized


def _finalize_waco_dataframe(raw: pd.DataFrame) -> pd.DataFrame:
    raw = raw.dropna(how="all")
    raw = _normalize_dataframe_columns(raw)
    df = add_derived_columns(raw)
    df = df.reset_index(drop=True)
    df["dataVis_row_id"] = df.index.astype(int)
    return df


def read_martin_excel_dataframe(
    path: Path,
    *,
    sheet_name: str = DATAVIS_WACO_SHEET,
) -> pd.DataFrame:
    """Full Martin study workbook ``data`` sheet (used by clean CSV export scripts)."""
    if not path.is_file():
        raise FileNotFoundError(f"dataVis workbook not found: {path}")

    raw = pd.read_excel(
        path,
        sheet_name=sheet_name,
        engine="openpyxl",
    )
    return _finalize_waco_dataframe(raw)


def read_waco_excel_dataframe(tier: int) -> pd.DataFrame:
    """Full Waco tier workbook (used by build_waco_clean_csv.py)."""
    return read_martin_excel_dataframe(waco_workbook_path(tier))


def _read_waco_clean_csv(tier: int) -> pd.DataFrame:
    path = waco_clean_csv_path(tier)
    if not path.is_file():
        raise FileNotFoundError(
            f"dataVis clean CSV not found: {path}. "
            f"Run: python scripts/build_martin_clean_csv.py"
        )
    raw = pd.read_csv(path)
    return _finalize_waco_dataframe(raw)


def _read_waco_dataset(tier: int) -> pd.DataFrame:
    csv_path = waco_clean_csv_path(tier)
    if csv_path.is_file():
        return _read_waco_clean_csv(tier)
    return read_waco_excel_dataframe(tier)


def _read_badger_dataset() -> pd.DataFrame:
    csv_path = badger_clean_csv_path()
    if csv_path.is_file():
        raw = pd.read_csv(csv_path)
        return _finalize_waco_dataframe(raw)
    return read_martin_excel_dataframe(badger_workbook_path())


def load_badger_dataframe(force_reload: bool = False) -> pd.DataFrame:
    global _badger_cache, _active_martin_study, _active_load_mw
    with _lock:
        if not force_reload and _badger_cache and "df" in _badger_cache:
            _active_martin_study = MARTIN_STUDY_BADGER
            _active_load_mw = 200
            return _badger_cache["df"]

    df = _read_badger_dataset()
    csv_path = badger_clean_csv_path()
    source_name = csv_path.name if csv_path.is_file() else badger_workbook_path().name
    with _lock:
        _active_martin_study = MARTIN_STUDY_BADGER
        _active_load_mw = 200
        _badger_cache = {
            "df": df,
            "loaded_at": pd.Timestamp.utcnow().isoformat(),
            "workbook": source_name,
        }
    return df


def load_waco_dataframe(load_mw: int | None = None, force_reload: bool = False) -> pd.DataFrame:
    global _active_load_mw, _active_martin_study
    tier = resolve_waco_load_mw(load_mw)
    with _lock:
        bucket = _cache_by_load_mw.get(tier)
        if not force_reload and bucket and "df" in bucket:
            _active_load_mw = tier
            _active_martin_study = MARTIN_STUDY_WACO
            return bucket["df"]

    # Disk I/O can take 30–90s for Excel — never hold _lock across reads.
    df = _read_waco_dataset(tier)
    csv_path = waco_clean_csv_path(tier)
    source_name = csv_path.name if csv_path.is_file() else waco_workbook_path(tier).name
    with _lock:
        _active_load_mw = tier
        _active_martin_study = MARTIN_STUDY_WACO
        _cache_by_load_mw[tier] = {
            "df": df,
            "loaded_at": pd.Timestamp.utcnow().isoformat(),
            "workbook": source_name,
        }
    return df


def load_martin_dataframe(
    *,
    load_mw: int | None = None,
    martin_study: str | None = None,
    force_reload: bool = False,
) -> pd.DataFrame:
    study = set_active_martin_study(martin_study or get_active_martin_study())
    if study == MARTIN_STUDY_BADGER:
        return load_badger_dataframe(force_reload=force_reload)
    return load_waco_dataframe(load_mw, force_reload=force_reload)


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
