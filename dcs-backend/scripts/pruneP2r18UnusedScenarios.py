#!/usr/bin/env python3
"""
Remove P2R_18 scenario bundles (.data/) and .sim.json files not referenced in
p2r_18.conf.json, p2r_18.ensemble.json chart panels, or per-scenario charts /
connection readouts. Updates ensemble member_simulations lists.

Default: dry-run. Pass --apply to delete files and rewrite ensemble JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from typing import Any, Set

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DESIGN_DIR = os.path.join(BACKEND_DIR, "designs", "p2r_18")
ENSEMBLE_PATH = os.path.join(DESIGN_DIR, "p2r_18.ensemble.json")

# Reuse column/chart reference scanning from column pruner.
sys.path.insert(0, SCRIPT_DIR)
from pruneP2r18UnusedColumns import parse_qualified  # noqa: E402


def collect_referenced_sim_ids() -> Set[str]:
    used: set[str] = set()

    def add_sim(sim_id: str | None) -> None:
        if sim_id and str(sim_id).strip():
            used.add(str(sim_id).strip())

    def ingest(val: Any, default_sim: str | None = None) -> None:
        if not val or not isinstance(val, str):
            return
        sid, _col = parse_qualified(val)
        if sid:
            add_sim(sid)
        elif default_sim:
            add_sim(default_sim)

    conf_path = os.path.join(DESIGN_DIR, "p2r_18.conf.json")
    with open(conf_path, encoding="utf-8") as fp:
        conf = json.load(fp)

    def walk_readouts(obj: Any) -> None:
        if obj is None:
            return
        if isinstance(obj, dict):
            cr = obj.get("connectionReadout")
            slots = cr.get("slots") if isinstance(cr, dict) else None
            if isinstance(slots, list):
                for slot in slots:
                    if isinstance(slot, dict):
                        add_sim(slot.get("ensembleSimId") or slot.get("simId"))
            for v in obj.values():
                walk_readouts(v)
        elif isinstance(obj, list):
            for item in obj:
                walk_readouts(item)

    walk_readouts(conf.get("canvasComponents") or [])
    walk_readouts(conf.get("connections") or [])

    with open(ENSEMBLE_PATH, encoding="utf-8") as fp:
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
                if not isinstance(chart, dict):
                    continue
                default_sim = chart.get("ensemble_sim_id")
                add_sim(default_sim)
                ingest(chart.get("x_column"), default_sim)
                ingest(chart.get("y_column"), default_sim)
                for y in chart.get("y_columns") or []:
                    ingest(y, default_sim)
                for comp in chart.get("components") or []:
                    if isinstance(comp, dict):
                        ingest(comp.get("columnName"), default_sim)
                for k in (chart.get("variable_styles") or {}):
                    ingest(k, default_sim)
                for k in (chart.get("legend_labels") or {}):
                    ingest(k, default_sim)

    for sim_json in os.listdir(DESIGN_DIR):
        if not sim_json.endswith(".sim.json"):
            continue
        sim_name = sim_json[: -len(".sim.json")]
        path = os.path.join(DESIGN_DIR, sim_json)
        with open(path, encoding="utf-8") as fp:
            sim = json.load(fp)
        for chart in sim.get("charts_to_display") or []:
            ds = chart.get("ensemble_sim_id") or sim_name
            add_sim(ds)
            ingest(chart.get("x_column"), ds)
            ingest(chart.get("y_column"), ds)
            for y in chart.get("y_columns") or []:
                ingest(y, ds)

    # Materialized formula columns (conf readouts); sim.json only, not an ensemble member.
    add_sim("formula")

    return used


def list_local_sim_names() -> list[str]:
    names: set[str] = set()
    for entry in os.listdir(DESIGN_DIR):
        if entry.endswith(".sim.json"):
            names.add(entry[: -len(".sim.json")])
        if entry.endswith(".data") and os.path.isdir(os.path.join(DESIGN_DIR, entry)):
            names.add(entry[: -len(".data")])
    return sorted(names)


def update_ensemble_members(keep: Set[str], apply: bool) -> int:
    # formula is not a parquet member scenario
    member_keep = {s for s in keep if s != "formula"}
    with open(ENSEMBLE_PATH, encoding="utf-8") as fp:
        doc = json.load(fp)
    removed_from_lists = 0
    for ensemble in doc.get("ensembles") or []:
        if not isinstance(ensemble, dict):
            continue
        members = ensemble.get("member_simulations")
        if not isinstance(members, list):
            continue
        new_members = [m for m in members if m in member_keep]
        removed_from_lists += len(members) - len(new_members)
        ensemble["member_simulations"] = new_members
    if apply:
        with open(ENSEMBLE_PATH, "w", encoding="utf-8") as fp:
            json.dump(doc, fp, indent=2, ensure_ascii=False)
            fp.write("\n")
    return removed_from_lists


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove unreferenced P2R_18 scenario bundles")
    parser.add_argument("--apply", action="store_true", help="Delete files and update ensemble JSON")
    args = parser.parse_args()

    keep = collect_referenced_sim_ids()
    all_sims = list_local_sim_names()
    to_remove = [s for s in all_sims if s not in keep and s != "formula"]

    print(f"Referenced scenarios to keep: {len(keep)}")
    print(f"Local scenarios (sim.json and/or .data): {len(all_sims)}")
    print(f"Scenarios to remove: {len(to_remove)}")
    for name in to_remove:
        has_data = os.path.isdir(os.path.join(DESIGN_DIR, f"{name}.data"))
        has_sim = os.path.isfile(os.path.join(DESIGN_DIR, f"{name}.sim.json"))
        print(f"  - {name} (data={has_data}, sim.json={has_sim})")

    ens_pruned = update_ensemble_members(keep, apply=False)
    print(f"\nEnsemble member entries that would be removed: {ens_pruned}")

    if not args.apply:
        print("\nDry-run only. Re-run with --apply to delete scenarios and trim ensemble lists.")
        return 0

    for name in to_remove:
        data_dir = os.path.join(DESIGN_DIR, f"{name}.data")
        sim_path = os.path.join(DESIGN_DIR, f"{name}.sim.json")
        if os.path.isdir(data_dir):
            shutil.rmtree(data_dir)
        if os.path.isfile(sim_path):
            os.remove(sim_path)

    update_ensemble_members(keep, apply=True)
    print(f"\nRemoved {len(to_remove)} scenario(s) and updated {ENSEMBLE_PATH}")
    print("Run scripts/pruneP2r18UnusedColumns.py --apply to drop unused columns on remaining bundles.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
