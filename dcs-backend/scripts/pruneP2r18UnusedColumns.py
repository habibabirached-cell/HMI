#!/usr/bin/env python3
"""
Remove Parquet columns from P2R_18 scenarios that are not referenced anywhere in the
design (conf, ensemble chart panels, per-scenario .sim.json charts, connection readouts).

Default: dry-run. Pass --apply to rewrite bundles and .sim.json shapes.

Does NOT remove scenarios from the ensemble member list — only unused columns per scenario.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from typing import Any, Dict, Iterable, Optional, Set, Tuple

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DESIGN_DIR = os.path.join(BACKEND_DIR, "designs", "p2r_18")

ENSEMBLE_SEP = " — "
TIME_COL_CANDIDATES = ("Time (s)", "time_sec", "Time", "time", "t")


def pick_time_column(columns: Iterable[str]) -> Optional[str]:
    cols = list(columns)
    for c in TIME_COL_CANDIDATES:
        if c in cols:
            return c
    return cols[0] if cols else None


def parse_qualified(value: str) -> Tuple[Optional[str], str]:
    if not value or not isinstance(value, str):
        return None, ""
    idx = value.find(ENSEMBLE_SEP)
    if idx <= 0:
        return None, value.strip()
    return value[:idx].strip(), value[idx + len(ENSEMBLE_SEP) :].strip()


def add_ref(used: Dict[str, Set[str]], sim_id: Optional[str], column: Optional[str]) -> None:
    if not sim_id or not column:
        return
    used[sim_id].add(str(column).strip())


def collect_formula_refs(formula: str, pool: Set[str]) -> Set[str]:
    if not formula or not pool:
        return set()
    sorted_cols = sorted(pool, key=len, reverse=True)
    used: Set[str] = set()
    remainder = formula
    for col in sorted_cols:
        if col and col in remainder:
            used.add(col)
            remainder = remainder.replace(col, "\0")
    return used


def expand_derived_columns(
    sim_id: str,
    derived_list: list,
    csv_columns: Set[str],
    used: Dict[str, Set[str]],
) -> None:
    csv_set = set(csv_columns)
    done_derived: Set[str] = set()
    for item in derived_list or []:
        name = (item.get("name") or "").strip()
        formula = item.get("formula") or ""
        pool = csv_set | done_derived
        for ref in collect_formula_refs(formula, pool):
            if ref in csv_set:
                add_ref(used, sim_id, ref)
        if name:
            add_ref(used, sim_id, name)
            done_derived.add(name)


def collect_from_chart(chart: dict, used: Dict[str, Set[str]]) -> None:
    if not isinstance(chart, dict):
        return
    default_sim = chart.get("ensemble_sim_id")

    def ingest(val: Any) -> None:
        if not val or not isinstance(val, str):
            return
        sid, col = parse_qualified(val)
        if sid:
            add_ref(used, sid, col)
        elif default_sim:
            add_ref(used, default_sim, col)

    ingest(chart.get("x_column"))
    ingest(chart.get("y_column"))
    for y in chart.get("y_columns") or []:
        ingest(y)
    for comp in chart.get("components") or []:
        if isinstance(comp, dict):
            ingest(comp.get("columnName"))
    for key in (chart.get("variable_styles") or {}).keys():
        ingest(key)
    for key in (chart.get("legend_labels") or {}).keys():
        ingest(key)


def walk_for_readouts(obj: Any, used: Dict[str, Set[str]]) -> None:
    if obj is None:
        return
    if isinstance(obj, dict):
        cr = obj.get("connectionReadout")
        slots = cr.get("slots") if isinstance(cr, dict) else None
        if isinstance(slots, list):
            for slot in slots:
                if not isinstance(slot, dict):
                    continue
                sid = slot.get("ensembleSimId") or slot.get("simId")
                col = slot.get("column")
                add_ref(used, sid, col)
        for v in obj.values():
            walk_for_readouts(v, used)
    elif isinstance(obj, list):
        for item in obj:
            walk_for_readouts(item, used)


def load_manifest_columns(sim_name: str) -> list[str]:
    path = os.path.join(DESIGN_DIR, f"{sim_name}.data", "manifest.json")
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8") as fp:
        data = json.load(fp)
    return [str(c) for c in data.get("columns") or []]


def collect_used_columns() -> Dict[str, Set[str]]:
    used: Dict[str, Set[str]] = defaultdict(set)

    conf_path = os.path.join(DESIGN_DIR, "p2r_18.conf.json")
    with open(conf_path, encoding="utf-8") as fp:
        conf = json.load(fp)
    walk_for_readouts(conf.get("canvasComponents") or [], used)
    walk_for_readouts(conf.get("connections") or [], used)

    ens_path = os.path.join(DESIGN_DIR, "p2r_18.ensemble.json")
    with open(ens_path, encoding="utf-8") as fp:
        ens_doc = json.load(fp)

    skip_keys = {"id", "display_name", "member_simulations", "version"}
    for ensemble in ens_doc.get("ensembles") or []:
        if not isinstance(ensemble, dict):
            continue
        for key, val in ensemble.items():
            if key in skip_keys:
                continue
            if not isinstance(val, dict):
                continue
            for chart in val.get("charts_to_display") or []:
                collect_from_chart(chart, used)
            expand_derived_columns(
                "formula",
                val.get("derived_variables") or [],
                set(load_manifest_columns("formula")),
                used,
            )

    for sim_json in os.listdir(DESIGN_DIR):
        if not sim_json.endswith(".sim.json"):
            continue
        sim_name = sim_json[: -len(".sim.json")]
        path = os.path.join(DESIGN_DIR, sim_json)
        with open(path, encoding="utf-8") as fp:
            sim = json.load(fp)
        for chart in sim.get("charts_to_display") or []:
            collect_from_chart({**chart, "ensemble_sim_id": chart.get("ensemble_sim_id") or sim_name}, used)
        expand_derived_columns(
            sim_name,
            sim.get("derived_variables") or sim.get("sim_config", {}).get("derived_variables") or [],
            set(load_manifest_columns(sim_name)),
            used,
        )

    # Always retain time axis per scenario that has a bundle.
    for sim_name in list_sim_names_with_bundles():
        cols = load_manifest_columns(sim_name)
        tc = pick_time_column(cols)
        if tc:
            add_ref(used, sim_name, tc)

    return used


def list_sim_names_with_bundles() -> list[str]:
    names = []
    for entry in os.listdir(DESIGN_DIR):
        if entry.endswith(".data") and os.path.isdir(os.path.join(DESIGN_DIR, entry)):
            names.append(entry[: -len(".data")])
    return sorted(names)


def refresh_sim_json_shape(sim_name: str, col_count: int, row_count: int) -> None:
    path = os.path.join(DESIGN_DIR, f"{sim_name}.sim.json")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fp:
        doc = json.load(fp)
    doc["data_column_count"] = col_count
    doc["data_row_count"] = row_count
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(doc, fp, indent=2, ensure_ascii=False)
        fp.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Prune unused Parquet columns from P2R_18")
    parser.add_argument("--apply", action="store_true", help="Rewrite Parquet bundles (default: dry-run)")
    args = parser.parse_args()

    sys.path.insert(0, BACKEND_DIR)
    from simulation_parquet_bundle import (  # noqa: E402
        bundle_exists,
        delete_bundle_column,
        read_bundle_columns_row_count,
    )

    used = collect_used_columns()
    sim_names = list_sim_names_with_bundles()

    total_remove = 0
    report_lines = []

    for sim_name in sim_names:
        if not bundle_exists(DESIGN_DIR, sim_name):
            continue
        cols, row_count = read_bundle_columns_row_count(DESIGN_DIR, sim_name)
        keep = used.get(sim_name, set())
        # Columns referenced only via qualified labels on other sims still live in keep for that sim.
        to_remove = [c for c in cols if c not in keep]
        if not to_remove:
            continue
        total_remove += len(to_remove)
        report_lines.append(
            f"{sim_name}: remove {len(to_remove)}/{len(cols)} unused — keep {sorted(keep)}"
        )
        report_lines.append(f"  drop: {to_remove}")
        if args.apply:
            for col in to_remove:
                delete_bundle_column(DESIGN_DIR, sim_name, col)
            cols_after, rc = read_bundle_columns_row_count(DESIGN_DIR, sim_name)
            refresh_sim_json_shape(sim_name, len(cols_after), rc)

    print(f"Scenarios with unused columns: {len(report_lines) // 2 if report_lines else 0}")
    print(f"Total columns to remove: {total_remove}")
    for line in report_lines:
        print(line)
    if not args.apply:
        print("\nDry-run only. Re-run with --apply to delete Parquet columns.")
    else:
        print("\nApplied. Restart backend / refresh UI metadata if the app is running.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
