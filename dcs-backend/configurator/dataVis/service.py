"""Business logic for dataVis endpoints."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from configurator.dataVis.column_metadata import (
    COLUMN_BY_KEY,
    COLUMNS,
    DEFAULT_HEATMAP_X,
    DEFAULT_HEATMAP_Y,
    DEFAULT_HEATMAP_Z,
    DEFAULT_SCATTER_COLOR,
    DEFAULT_SCATTER_X,
    DEFAULT_SCATTER_Y,
    PARALLEL_DEFAULT_DIMS,
)
from configurator.dataVis.filters import apply_filters
from configurator.dataVis.dataset_mode import (
    get_datavis_dataframe,
    get_dataset_mode,
    reset_datavis_mode,
    set_dataset_mode,
)
from configurator.dataVis.loader import (
    column_stats,
    get_active_martin_study,
    get_active_waco_load_mw,
    load_martin_dataframe,
    load_waco_dataframe,
    set_active_martin_study,
    set_active_waco_load_mw,
)
from configurator.dataVis.paths import (
    DATAVIS_WACO_SHEET,
    MARTIN_STUDY_BADGER,
    MARTIN_STUDIES,
    badger_dataset_source,
    scenario_context_for_badger,
    scenario_context_for_load,
    waco_dataset_source,
    waco_workbook_path,
)
from configurator.dataVis.quality import run_quality_checks


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, (str, bool)):
        return value
    if pd.isna(value):
        return None
    return value


def _records(df: pd.DataFrame) -> list[dict[str, Any]]:
    rows = df.to_dict(orient="records")
    return [{k: _json_safe(v) for k, v in row.items()} for row in rows]


def _active_dataset_source() -> dict[str, str]:
    if get_active_martin_study() == MARTIN_STUDY_BADGER:
        return badger_dataset_source()
    return waco_dataset_source(get_active_waco_load_mw())


def get_health() -> dict[str, Any]:
    try:
        df = get_datavis_dataframe()
        return {
            "ok": True,
            "rows": len(df),
            "dataset_mode": get_dataset_mode(),
            "load_mw": get_active_waco_load_mw(),
            "martin_study": get_active_martin_study(),
            "workbook": _active_dataset_source().get("file"),
            "dataset_source": _active_dataset_source(),
            "sheet": DATAVIS_WACO_SHEET,
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def _column_stats_for_dataframe(df: pd.DataFrame) -> list[dict[str, Any]]:
    stats = [column_stats(df, c["key"]) for c in COLUMNS if c["key"] in df.columns]
    extra_cols = [c for c in df.columns if c not in COLUMN_BY_KEY]
    for col in extra_cols:
        stats.append(column_stats(df, col))
    return stats


def get_column_stats(filters: list[dict] | None = None) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), filters)
    return {"row_count": len(df), "column_stats": _column_stats_for_dataframe(df)}


def apply_dataset_mode(mode: str) -> dict[str, Any]:
    return set_dataset_mode(mode)


def ensure_waco_tier(load_mw: int | None, martin_study: str | None = None) -> None:
    """Select Martin study + Waco tier before dataVis queries."""
    ensure_martin_dataset(load_mw=load_mw, martin_study=martin_study)


def ensure_martin_dataset(
    load_mw: int | None = None,
    martin_study: str | None = None,
) -> None:
    study = martin_study if martin_study in MARTIN_STUDIES else get_active_martin_study()
    prev_study = get_active_martin_study()
    if martin_study in MARTIN_STUDIES:
        set_active_martin_study(martin_study)
        study = martin_study
    if study == MARTIN_STUDY_BADGER:
        if prev_study != study:
            reset_datavis_mode()
        load_martin_dataframe(load_mw=200, martin_study=study, force_reload=False)
        return

    if load_mw is None:
        load_martin_dataframe(load_mw=get_active_waco_load_mw(), martin_study=study, force_reload=False)
        return
    try:
        tier = int(round(float(load_mw)))
    except (TypeError, ValueError):
        return
    if tier not in (200, 1000):
        return
    prev = get_active_waco_load_mw()
    load_martin_dataframe(load_mw=tier, martin_study=study, force_reload=False)
    set_active_waco_load_mw(tier)
    if prev_study != study or prev != tier:
        reset_datavis_mode()


def get_meta(requested_load_mw: int | None = None, martin_study: str | None = None) -> dict[str, Any]:
    ensure_martin_dataset(load_mw=requested_load_mw, martin_study=martin_study)

    df = get_datavis_dataframe()
    stats = _column_stats_for_dataframe(df)
    active = get_active_waco_load_mw()
    study = get_active_martin_study()
    if study == MARTIN_STUDY_BADGER:
        scenario = scenario_context_for_badger()
        source = badger_dataset_source()
    else:
        scenario = scenario_context_for_load(active)
        source = waco_dataset_source(active)

    return {
        "scenario": scenario,
        "load_mw": active,
        "martin_study": study,
        "workbook": source.get("file"),
        "dataset_source": source,
        "dataset_mode": get_dataset_mode(),
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": COLUMNS,
        "column_stats": stats,
        "defaults": {
            "scatter": {
                "x": DEFAULT_SCATTER_X,
                "y": DEFAULT_SCATTER_Y,
                "color": DEFAULT_SCATTER_COLOR,
            },
            "heatmap": {
                "x": DEFAULT_HEATMAP_X,
                "y": DEFAULT_HEATMAP_Y,
                "z": DEFAULT_HEATMAP_Z,
            },
            "parallel_dimensions": [
                d for d in PARALLEL_DEFAULT_DIMS if d in df.columns
            ],
        },
    }


def get_filtered_row_ids(filters: list[dict] | None = None) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), filters)
    if "dataVis_row_id" in df.columns:
        ids = df["dataVis_row_id"].astype(int).tolist()
    else:
        ids = list(range(len(df)))
    return {"count": len(df), "row_ids": ids}


def get_overview(filters: list[dict] | None = None) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), filters)
    n = len(df)
    if n == 0:
        return {"filtered_count": 0, "kpis": {}}

    kpis: dict[str, Any] = {"filtered_count": n}

    def q(col: str, stat: str):
        if col not in df.columns:
            return None
        s = df[col].dropna()
        if s.empty:
            return None
        if stat == "min":
            return _json_safe(s.min())
        if stat == "max":
            return _json_safe(s.max())
        if stat == "mean":
            return _json_safe(s.mean())
        if stat == "median":
            return _json_safe(s.median())
        return None

    kpis["project_lcoe"] = {
        "min": q("Project LCOE ($/MWh)", "min"),
        "max": q("Project LCOE ($/MWh)", "max"),
        "median": q("Project LCOE ($/MWh)", "median"),
    }
    kpis["load_compliance"] = {
        "min": q("Year 1 Load Compliance (%)", "min"),
        "max": q("Year 1 Load Compliance (%)", "max"),
        "median": q("Year 1 Load Compliance (%)", "median"),
    }
    kpis["cfe"] = {
        "min": q("Carbon Free Energy (%)", "min"),
        "max": q("Carbon Free Energy (%)", "max"),
        "median": q("Carbon Free Energy (%)", "median"),
    }

    if "Year 1 Load Compliance (%)" in df.columns:
        kpis["pct_meeting_99_load"] = _json_safe(
            100.0 * (df["Year 1 Load Compliance (%)"] >= 99).mean()
        )

    pareto_n = min(150, n)  # overview KPI preview; UI chart uses /rows with same limit
    if "Project LCOE ($/MWh)" in df.columns:
        best = df.nsmallest(pareto_n, "Project LCOE ($/MWh)").sort_values(
            "Project LCOE ($/MWh)", ascending=True
        )
        kpis["pareto_preview"] = _records(
            best[
                [
                    c
                    for c in [
                        "dataVis_row_id",
                        "Project LCOE ($/MWh)",
                        "Year 1 Load Compliance (%)",
                        "Solar AC Nameplate (MWac)",
                        "Wind Nameplate (MWac)",
                    ]
                    if c in best.columns
                ]
            ]
        )

    return {"filtered_count": n, "kpis": kpis}


def get_doe_summary(filters: list[dict] | None = None) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), filters)
    input_cols = [
        c["key"]
        for c in COLUMNS
        if c.get("role") == "input" and c["key"] in df.columns
    ]
    summaries = []
    for col in input_cols:
        s = df[col].dropna()
        uniq = int(s.nunique())
        summaries.append(
            {
                "column": col,
                "unique_values": uniq,
                "min": _json_safe(s.min()) if not s.empty else None,
                "max": _json_safe(s.max()) if not s.empty else None,
                "sample_values": sorted(s.unique().tolist())[:12]
                if uniq <= 12
                else None,
            }
        )
    return {"filtered_count": len(df), "inputs": summaries}


def get_rows(req: dict) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), req.get("filters"))
    total = len(df)
    sort_col = req.get("sort_column")
    if sort_col and sort_col in df.columns:
        df = df.sort_values(sort_col, ascending=bool(req.get("sort_asc", True)))
    offset = max(0, int(req.get("offset", 0)))
    limit = min(500, max(1, int(req.get("limit", 100))))
    slice_df = df.iloc[offset : offset + limit]
    cols = req.get("columns")
    if cols:
        keep = [c for c in cols if c in slice_df.columns]
        if "dataVis_row_id" not in keep and "dataVis_row_id" in slice_df.columns:
            keep = ["dataVis_row_id", *keep]
        slice_df = slice_df[keep]
    return {"total": total, "offset": offset, "limit": limit, "rows": _records(slice_df)}


def build_scatter(req: dict) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), req.get("filters"))
    x, y = req["x"], req["y"]
    for col in (x, y):
        if col not in df.columns:
            raise ValueError(f"Unknown column: {col}")
    color = req.get("color")
    size = req.get("size")
    max_points = int(req.get("max_points", 5000))
    x_vals = df[x].astype(float)
    y_vals = df[y].astype(float)
    x_clean = x_vals.dropna()
    y_clean = y_vals.dropna()
    payload: dict[str, Any] = {
        "count": len(df),
        "x": x_vals.tolist(),
        "y": y_vals.tolist(),
        "x_label": x,
        "y_label": y,
        "x_range": [float(x_clean.min()), float(x_clean.max())]
        if len(x_clean)
        else None,
        "y_range": [float(y_clean.min()), float(y_clean.max())]
        if len(y_clean)
        else None,
        "row_ids": df["dataVis_row_id"].tolist()
        if "dataVis_row_id" in df.columns
        else list(range(len(df))),
    }

    detail_columns = req.get("detail_columns") or []
    if detail_columns:
        details: dict[str, list[Any]] = {}
        for col in detail_columns:
            if col not in df.columns:
                continue
            series = df[col]
            if pd.api.types.is_numeric_dtype(series):
                details[col] = series.where(series.notna(), None).tolist()
            else:
                details[col] = series.astype(object).where(series.notna(), None).tolist()
        if details:
            payload["details"] = details

    if len(df) > max_points:
        df = df.sample(n=max_points, random_state=42)
        payload["x"] = df[x].astype(float).tolist()
        payload["y"] = df[y].astype(float).tolist()
        payload["row_ids"] = (
            df["dataVis_row_id"].tolist()
            if "dataVis_row_id" in df.columns
            else list(range(len(df)))
        )
        if "details" in payload:
            for col in list(payload["details"].keys()):
                if col in df.columns:
                    series = df[col]
                    if pd.api.types.is_numeric_dtype(series):
                        payload["details"][col] = series.where(series.notna(), None).tolist()
                    else:
                        payload["details"][col] = (
                            series.astype(object).where(series.notna(), None).tolist()
                        )
    if color and color in df.columns:
        payload["color"] = df[color].tolist()
        payload["color_label"] = color
    if size and size in df.columns:
        payload["size"] = df[size].tolist()
        payload["size_label"] = size
    return payload


def build_heatmap(req: dict) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), req.get("filters"))
    x, y, z = req["x"], req["y"], req["z"]
    for col in (x, y, z):
        if col not in df.columns:
            raise ValueError(f"Unknown column: {col}")
    sub = df[[x, y, z]].dropna()
    if sub.empty:
        return {"x": [], "y": [], "z": [], "x_label": x, "y_label": y, "z_label": z}

    x_bins = int(req.get("x_bins", 25))
    y_bins = int(req.get("y_bins", 25))
    agg = req.get("agg", "mean")

    x_vals = sub[x].astype(float)
    y_vals = sub[y].astype(float)
    try:
        x_cat = pd.cut(x_vals, bins=min(x_bins, max(3, x_vals.nunique())), duplicates="drop")
        y_cat = pd.cut(y_vals, bins=min(y_bins, max(3, y_vals.nunique())), duplicates="drop")
        grouped = sub.assign(_xb=x_cat, _yb=y_cat).groupby(["_yb", "_xb"], observed=True)[z]
    except ValueError:
        grouped = sub.groupby([y, x])[z]

    if agg == "count":
        pivot = grouped.count().unstack(fill_value=np.nan)
    elif agg == "median":
        pivot = grouped.median().unstack(fill_value=np.nan)
    elif agg == "min":
        pivot = grouped.min().unstack(fill_value=np.nan)
    elif agg == "max":
        pivot = grouped.max().unstack(fill_value=np.nan)
    else:
        pivot = grouped.mean().unstack(fill_value=np.nan)

    x_labels = [str(c) for c in pivot.columns]
    y_labels = [str(i) for i in pivot.index]
    z_grid = pivot.values.tolist()
    z_clean = [[_json_safe(v) for v in row] for row in z_grid]
    return {
        "x": x_labels,
        "y": y_labels,
        "z": z_clean,
        "x_label": x,
        "y_label": y,
        "z_label": z,
        "agg": agg,
    }


def build_histogram(req: dict) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), req.get("filters"))
    col = req["column"]
    if col not in df.columns:
        raise ValueError(f"Unknown column: {col}")
    series = pd.to_numeric(df[col], errors="coerce")
    vals = series.dropna().astype(float).tolist()
    return {
        "column": col,
        "values": [_json_safe(v) for v in vals],
        "count": len(vals),
        "filtered_count": len(df),
    }


def build_parallel(req: dict) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), req.get("filters"))
    dims = [d for d in req.get("dimensions", []) if d in df.columns]
    if not dims:
        raise ValueError("No valid parallel dimensions")
    max_rows = int(req.get("max_rows", 2000))
    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=42)
    color = req.get("color")
    out: dict[str, Any] = {
        "dimensions": dims,
        "values": {d: df[d].tolist() for d in dims},
        "row_ids": df["dataVis_row_id"].tolist()
        if "dataVis_row_id" in df.columns
        else list(range(len(df))),
    }
    if color and color in df.columns:
        out["color"] = df[color].tolist()
        out["color_label"] = color
    return out


def get_quality(filters: list[dict] | None = None) -> dict[str, Any]:
    df = apply_filters(get_datavis_dataframe(), filters)
    return {"filtered_count": len(df), "checks": run_quality_checks(df)}


def compare_rows(row_ids: list[int]) -> dict[str, Any]:
    df = get_datavis_dataframe()
    if "dataVis_row_id" not in df.columns:
        raise ValueError("Row ids not available")
    sub = df[df["dataVis_row_id"].isin(row_ids)]
    ordered = sub.set_index("dataVis_row_id").loc[row_ids].reset_index()
    return {"rows": _records(ordered)}
