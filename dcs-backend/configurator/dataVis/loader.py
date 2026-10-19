"""Load and cache Waco Excel datasets (200 MW and 1 GW tiers)."""

from __future__ import annotations

import json
import re
import threading
from contextvars import ContextVar
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
_badger_cache_by_load_mw: dict[int, dict[str, Any]] = {}
_active_load_mw: int = DEFAULT_WACO_LOAD_MW
_active_martin_study: str = MARTIN_STUDY_WACO
# Bumped every time a location or MW switch drops the in-memory frames.
# A load that started earlier must not publish after a newer switch.
_load_generation: int = 0
_request_study_epoch: ContextVar[int | None] = ContextVar("martin_study_epoch", default=None)

# After header normalization, map tier-specific names to canonical Martin/dataVis keys.
COLUMN_ALIASES: dict[str, str] = {
    "Annual Load Compliance (%)": "Year 1 Load Compliance (%)",
    "Project LCOE ($/MWh) at default CAPEX/Fuel values": "Project LCOE ($/MWh)",
    "Project CAPEX ($ M) @ Default Value": "Project CAPEX ($ M)",
    # Wisconsin 1 GW names the heavy-duty count after the 7HA.02. Texas uses "7HA Unit #".
    "7HA.02 Unit #": "7HA Unit #",
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


def _parse_study_epoch(raw: object) -> int | None:
    if raw is None or raw == "":
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def bind_request_martin_study_epoch(epoch: int | None):
    """Attach this HTTP request's selection order. Reset the returned token in a finally."""
    return _request_study_epoch.set(epoch)


def reset_request_martin_study_epoch(token) -> None:
    _request_study_epoch.reset(token)


def _set_active_study_locked(study: str) -> None:
    """Publish the study this load just read. Caller holds ``_lock``."""
    global _active_martin_study
    _active_martin_study = study if study in MARTIN_STUDIES else MARTIN_STUDY_WACO


def discard_martin_dataframes() -> None:
    """Drop every in-memory Martin frame so the next load reads the clean CSV."""
    with _lock:
        _badger_cache_by_load_mw.clear()
        _cache_by_load_mw.clear()


def begin_martin_csv_load() -> int:
    """Drop in-memory frames and start a new selection. Older loads must not publish."""
    global _load_generation
    with _lock:
        _load_generation += 1
        token = _load_generation
        _badger_cache_by_load_mw.clear()
        _cache_by_load_mw.clear()
        return token


def current_martin_load_generation() -> int:
    with _lock:
        return _load_generation


def _may_publish(generation: int | None) -> bool:
    """``None`` publishes. A token publishes only if no newer switch has started."""
    if generation is None:
        return True
    return generation == _load_generation


def set_active_martin_study(study: str) -> str:
    with _lock:
        _set_active_study_locked(study)
        return _active_martin_study


async def martin_study_epoch_middleware(request, call_next):
    """Read martinStudyEpoch from the query string or JSON body for this request."""
    path = request.url.path or ""
    if not path.startswith("/api/configurator"):
        return await call_next(request)

    epoch = _parse_study_epoch(request.query_params.get("martinStudyEpoch"))
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()
        content_type = request.headers.get("content-type", "")
        if body and "application/json" in content_type:
            try:
                payload = json.loads(body)
            except (TypeError, ValueError):
                payload = None
            if isinstance(payload, dict) and "martinStudyEpoch" in payload:
                parsed = _parse_study_epoch(payload.get("martinStudyEpoch"))
                if parsed is not None:
                    epoch = parsed

    token = bind_request_martin_study_epoch(epoch)
    try:
        return await call_next(request)
    finally:
        reset_request_martin_study_epoch(token)


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


def _read_badger_dataset(tier: int) -> pd.DataFrame:
    csv_path = badger_clean_csv_path(tier)
    if csv_path.is_file():
        raw = pd.read_csv(csv_path)
        return _finalize_waco_dataframe(raw)
    return read_martin_excel_dataframe(badger_workbook_path(tier))


def load_badger_dataframe(
    load_mw: int | None = None,
    force_reload: bool = False,
    generation: int | None = None,
) -> pd.DataFrame:
    global _active_martin_study, _active_load_mw
    # A missing tier stays on the 200 MW Wisconsin study. Callers that want 1 GW pass 1000.
    tier = 200 if load_mw is None else resolve_waco_load_mw(load_mw)
    with _lock:
        bucket = _badger_cache_by_load_mw.get(tier)
        if not force_reload and bucket and "df" in bucket:
            if _may_publish(generation):
                _set_active_study_locked(MARTIN_STUDY_BADGER)
                _active_load_mw = tier
            return bucket["df"]

    df = _read_badger_dataset(tier)
    csv_path = badger_clean_csv_path(tier)
    source_name = csv_path.name if csv_path.is_file() else badger_workbook_path(tier).name
    with _lock:
        _badger_cache_by_load_mw[tier] = {
            "df": df,
            "loaded_at": pd.Timestamp.utcnow().isoformat(),
            "workbook": source_name,
        }
        if _may_publish(generation):
            _set_active_study_locked(MARTIN_STUDY_BADGER)
            _active_load_mw = tier
    return df


def load_waco_dataframe(
    load_mw: int | None = None,
    force_reload: bool = False,
    generation: int | None = None,
) -> pd.DataFrame:
    global _active_load_mw, _active_martin_study
    tier = resolve_waco_load_mw(load_mw)
    with _lock:
        bucket = _cache_by_load_mw.get(tier)
        if not force_reload and bucket and "df" in bucket:
            if _may_publish(generation):
                _set_active_study_locked(MARTIN_STUDY_WACO)
                _active_load_mw = tier
            return bucket["df"]

    # Disk I/O can take 30–90s for Excel — never hold _lock across reads.
    df = _read_waco_dataset(tier)
    csv_path = waco_clean_csv_path(tier)
    source_name = csv_path.name if csv_path.is_file() else waco_workbook_path(tier).name
    with _lock:
        _cache_by_load_mw[tier] = {
            "df": df,
            "loaded_at": pd.Timestamp.utcnow().isoformat(),
            "workbook": source_name,
        }
        if _may_publish(generation):
            _set_active_study_locked(MARTIN_STUDY_WACO)
            _active_load_mw = tier
    return df


def load_martin_dataframe(
    *,
    load_mw: int | None = None,
    martin_study: str | None = None,
    force_reload: bool = False,
    generation: int | None = None,
) -> pd.DataFrame:
    requested = martin_study if martin_study in MARTIN_STUDIES else None
    study = requested or get_active_martin_study()
    if _may_publish(generation):
        study = set_active_martin_study(study)
    if study == MARTIN_STUDY_BADGER:
        return load_badger_dataframe(
            load_mw=load_mw,
            force_reload=force_reload,
            generation=generation,
        )
    return load_waco_dataframe(load_mw, force_reload=force_reload, generation=generation)


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
