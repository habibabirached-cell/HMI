"""
Clone graph UI presets between designs without touching Parquet data or derived formulas.

Copies named ensemble chart presets used by quick-scenario shortcut buttons
(charts, stacks, panel layout, labels, legend positions, axis ranges, etc.)
while preserving each destination preset's derived_variables.
"""

from __future__ import annotations

import copy
import json
import os
from typing import Any, Optional

GRAPH_PRESET_FIELD_KEYS = (
    "charts_to_display",
    "chart_stacks",
    "chart_sample_default",
    "chart_panel_height",
    "chart_panel_opacity",
    "chart_card_width",
    "view_mode",
    "simulation_speed",
)

QUICK_SCENARIO_GRAPH_PRESET_NAMES = (
    "noBessNoStatcom",
    "withBessandStatCom",
    "withBessAlone",
    "withStatcomAlone",
)


def _looks_like_configuration_snapshot(obj: Any) -> bool:
    return isinstance(obj, dict) and "charts_to_display" in obj


def _ensemble_sidecar_path(dir_path: str) -> str:
    leaf = os.path.basename(dir_path.rstrip(os.sep))
    return os.path.join(dir_path, f"{leaf}.ensemble.json")


def _load_json(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return data


def _write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2, ensure_ascii=False)
        fp.write("\n")


def _find_ensemble_entry(raw_list: list, ensemble_id: str) -> Optional[dict[str, Any]]:
    want = str(ensemble_id or "").strip()
    aliases = {want}
    if want == "all":
        aliases.add("all_")
    elif want == "all_":
        aliases.add("all")
    for ent in raw_list or []:
        if not isinstance(ent, dict):
            continue
        eid = str(ent.get("id") or ent.get("name") or "").strip()
        if eid in aliases:
            return ent
    return None


def _extract_graph_fields(snapshot: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key in GRAPH_PRESET_FIELD_KEYS:
        if key in snapshot:
            out[key] = copy.deepcopy(snapshot[key])
    if "charts_to_display" not in out:
        raise ValueError("Source snapshot has no charts_to_display")
    return out


def _preserve_dest_derived_variables(
    merged: dict[str, Any],
    dest_existing: Optional[dict[str, Any]],
    dest_chart_panel: Optional[dict[str, Any]],
) -> None:
    if isinstance(dest_existing, dict) and "derived_variables" in dest_existing:
        merged["derived_variables"] = copy.deepcopy(dest_existing["derived_variables"])
    elif isinstance(dest_chart_panel, dict) and "derived_variables" in dest_chart_panel:
        merged["derived_variables"] = copy.deepcopy(dest_chart_panel["derived_variables"])
    else:
        merged.setdefault("derived_variables", [])


def clone_graph_presets_between_designs(
    *,
    dest_dir: str,
    source_dir: str,
    ensemble_id: str = "all_",
    preset_names: Optional[list[str]] = None,
) -> dict[str, Any]:
    """
    Copy graph-only preset snapshots from source design ensemble to destination ensemble.
    Returns { cloned: [...], skipped: [...], ensemble_id: str }.
    """
    if os.path.realpath(dest_dir) == os.path.realpath(source_dir):
        raise ValueError("Source and destination designs must be different")

    dest_ens_path = _ensemble_sidecar_path(dest_dir)
    source_ens_path = _ensemble_sidecar_path(source_dir)
    if not os.path.isfile(dest_ens_path):
        raise FileNotFoundError(f"Destination ensemble file not found: {dest_ens_path}")
    if not os.path.isfile(source_ens_path):
        raise FileNotFoundError(f"Source ensemble file not found: {source_ens_path}")

    dest_doc = _load_json(dest_ens_path)
    source_doc = _load_json(source_ens_path)
    dest_ent = _find_ensemble_entry(dest_doc.get("ensembles") or [], ensemble_id)
    source_ent = _find_ensemble_entry(source_doc.get("ensembles") or [], ensemble_id)
    if dest_ent is None:
        raise ValueError(f"Ensemble not found in destination: {ensemble_id!r}")
    if source_ent is None:
        raise ValueError(f"Ensemble not found in source: {ensemble_id!r}")

    resolved_id = str(dest_ent.get("id") or dest_ent.get("name") or ensemble_id).strip()
    names = list(preset_names or QUICK_SCENARIO_GRAPH_PRESET_NAMES)
    dest_panel = dest_ent.get("chart_panel") if isinstance(dest_ent.get("chart_panel"), dict) else {}

    cloned: list[str] = []
    skipped: list[str] = []
    for preset_name in names:
        src_snap = source_ent.get(preset_name)
        if not _looks_like_configuration_snapshot(src_snap):
            skipped.append(preset_name)
            continue
        graph_only = _extract_graph_fields(src_snap)
        dest_existing = dest_ent.get(preset_name)
        if not isinstance(dest_existing, dict):
            dest_existing = None
        _preserve_dest_derived_variables(graph_only, dest_existing, dest_panel)
        dest_ent[preset_name] = graph_only
        cloned.append(preset_name)

    _write_json(dest_ens_path, dest_doc)
    return {
        "ensemble_id": resolved_id,
        "cloned": cloned,
        "skipped": skipped,
        "preset_names": names,
    }
