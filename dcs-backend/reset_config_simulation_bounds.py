"""
Reset simulation_start_at / simulation_end_at on every saved chart configuration
from each chart's associated scenario Parquet time column (min / max).
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

from simulation_parquet_bundle import (
    bundle_exists,
    read_bundle_columns_row_count,
    resolve_bundle_column_name,
    time_column_min_max_from_bundle,
)

# Mirror app.py reserved keys (avoid importing app to prevent circular imports).
SIM_JSON_RESERVED_ROOT_KEYS = frozenset(
    {
        "display_name",
        "description",
        "derived_variables",
        "charts_to_display",
        "event_markers",
        "chart_sample_default",
        "chart_panel_height",
        "chart_panel_opacity",
        "chart_card_width",
        "chart_stacks",
        "current_configuration",
    }
)

ENSEMBLE_ENTRY_RESERVED_KEYS = frozenset(
    {
        "id",
        "name",
        "display_name",
        "displayName",
        "member_simulations",
        "members",
        "chart_panel",
    }
)


def _looks_like_configuration_snapshot(obj: Any) -> bool:
    return isinstance(obj, dict) and "charts_to_display" in obj


def _pick_time_column_header(headers: list[str]) -> Optional[str]:
    for c in ("Time (s)", "time_sec", "Time", "time"):
        if c in headers:
            return c
    return headers[0] if headers else None


def _member_time_bounds(
    design_dir: str,
    sim_id: str,
    time_column: str,
) -> tuple[Optional[float], Optional[float]]:
    if not sim_id or not bundle_exists(design_dir, sim_id):
        return None, None
    columns, row_count = read_bundle_columns_row_count(design_dir, sim_id)
    if row_count <= 0 or not columns:
        return None, None
    resolved = resolve_bundle_column_name(columns, time_column) if time_column else None
    if not resolved:
        resolved = _pick_time_column_header(columns)
    if not resolved:
        return None, None
    return time_column_min_max_from_bundle(design_dir, sim_id, resolved)


def chart_time_bounds_from_data(
    design_dir: str,
    chart_def: dict,
    default_sim_id: Optional[str],
) -> tuple[Optional[float], Optional[float]]:
    """Min start / max end across all time axes referenced by one chart definition."""
    if not isinstance(chart_def, dict):
        return None, None

    bounds: list[tuple[float, float]] = []

    def add_bounds(sim_id: Optional[str], time_col: Optional[str]) -> None:
        if not sim_id:
            return
        t_min, t_max = _member_time_bounds(design_dir, sim_id, time_col or "")
        if t_min is not None and t_max is not None:
            bounds.append((t_min, t_max))

    if chart_def.get("ensemble_cross_member"):
        x_col = chart_def.get("x_column") or chart_def.get("time_column")
        y_cols = chart_def.get("y_columns") or []
        y_col = chart_def.get("y_column")
        sim_id = chart_def.get("ensemble_sim_id") or default_sim_id
        add_bounds(sim_id, x_col)
        for _ in y_cols:
            add_bounds(sim_id, x_col)
        if y_col:
            add_bounds(sim_id, x_col)
    elif chart_def.get("type") == "multi":
        add_bounds(
            chart_def.get("ensemble_sim_id") or default_sim_id,
            chart_def.get("x_column") or chart_def.get("time_column"),
        )
    else:
        sim_id = chart_def.get("ensemble_sim_id") or default_sim_id
        time_col = chart_def.get("x_column") or chart_def.get("time_column")
        add_bounds(sim_id, time_col)

    if not bounds:
        return None, None
    return min(b[0] for b in bounds), max(b[1] for b in bounds)


def apply_bounds_to_snapshot(
    snapshot: dict,
    design_dir: str,
    default_sim_id: Optional[str],
) -> int:
    if not _looks_like_configuration_snapshot(snapshot):
        return 0
    updated = 0
    for chart in snapshot.get("charts_to_display") or []:
        if not isinstance(chart, dict):
            continue
        t_min, t_max = chart_time_bounds_from_data(design_dir, chart, default_sim_id)
        if t_min is None or t_max is None:
            continue
        ar = chart.setdefault("axis_range", {})
        if not isinstance(ar, dict):
            ar = {}
            chart["axis_range"] = ar
        ar["simulation_start_at"] = t_min
        ar["simulation_end_at"] = t_max
        # Keep lock flags; refresh locked X window to match new data span.
        if ar.get("x_locked"):
            ar["x_min"] = t_min
            ar["x_max"] = t_max
        updated += 1
    return updated


def _update_sim_config_file(sim_json_path: str, design_dir: str, sim_name: str) -> tuple[int, int]:
    with open(sim_json_path, "r", encoding="utf-8") as fp:
        sim_config = json.load(fp)
    if not isinstance(sim_config, dict):
        return 0, 0

    configs = 0
    charts = 0

    cc = sim_config.get("current_configuration")
    if isinstance(cc, dict):
        n = apply_bounds_to_snapshot(cc, design_dir, sim_name)
        if n:
            configs += 1
            charts += n

    if _looks_like_configuration_snapshot(sim_config):
        n = apply_bounds_to_snapshot(sim_config, design_dir, sim_name)
        if n:
            configs += 1
            charts += n

    for key, val in sim_config.items():
        if key in SIM_JSON_RESERVED_ROOT_KEYS:
            continue
        if not _looks_like_configuration_snapshot(val):
            continue
        n = apply_bounds_to_snapshot(val, design_dir, sim_name)
        if n:
            configs += 1
            charts += n

    with open(sim_json_path, "w", encoding="utf-8") as fp:
        json.dump(sim_config, fp, indent=2, ensure_ascii=False)
        fp.write("\n")

    return configs, charts


def reset_all_config_simulation_bounds(design_dir: str, ensemble_sidecar_path: Optional[str] = None) -> dict:
    """
    Walk every .sim.json and optional {leaf}.ensemble.json; set simulation_start_at /
    simulation_end_at from Parquet time columns. Returns summary counts.
    """
    configs_updated = 0
    charts_updated = 0
    files_touched = 0

    if not os.path.isdir(design_dir):
        return {
            "configs_updated": 0,
            "charts_updated": 0,
            "files_touched": 0,
        }

    for name in sorted(os.listdir(design_dir)):
        if not name.endswith(".sim.json"):
            continue
        sim_name = name[: -len(".sim.json")]
        path = os.path.join(design_dir, name)
        c, ch = _update_sim_config_file(path, design_dir, sim_name)
        if c or ch:
            files_touched += 1
            configs_updated += c
            charts_updated += ch

    if ensemble_sidecar_path and os.path.isfile(ensemble_sidecar_path):
        with open(ensemble_sidecar_path, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        raw_list = data.get("ensembles") or []
        ens_changed = False
        for ent in raw_list:
            if not isinstance(ent, dict):
                continue
            members = ent.get("member_simulations") or ent.get("members") or []
            primary = members[0] if members else None

            panel = ent.get("chart_panel")
            if isinstance(panel, dict):
                n = apply_bounds_to_snapshot(panel, design_dir, primary)
                if n:
                    configs_updated += 1
                    charts_updated += n
                    ens_changed = True

            for key, val in ent.items():
                if key in ENSEMBLE_ENTRY_RESERVED_KEYS:
                    continue
                if not _looks_like_configuration_snapshot(val):
                    continue
                n = apply_bounds_to_snapshot(val, design_dir, primary)
                if n:
                    configs_updated += 1
                    charts_updated += n
                    ens_changed = True

        if ens_changed:
            with open(ensemble_sidecar_path, "w", encoding="utf-8") as fp:
                json.dump(data, fp, indent=2, ensure_ascii=False)
                fp.write("\n")
            files_touched += 1

    return {
        "configs_updated": configs_updated,
        "charts_updated": charts_updated,
        "files_touched": files_touched,
    }
