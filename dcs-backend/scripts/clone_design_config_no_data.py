#!/usr/bin/env python3
"""
Clone design UI configuration from a source design into a destination design
without copying Parquet / .data bundles.

Copies:
  - {leaf}.conf.json (preserves destination display name)
  - {leaf}.ensemble.json (charts, derived_variables, named presets)
  - *.sim.json metadata for scenarios that exist in both designs

Then re-materializes the ensemble `formula` scenario from destination member data.

Usage:
  python scripts/clone_design_config_no_data.py statcomPartha HabLight
  python scripts/clone_design_config_no_data.py statcomPartha HabLight --ensemble-fallback statcom05
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys
from typing import Any, Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS = os.path.join(ROOT, "designs")
sys.path.insert(0, ROOT)

from ensemble_formula_materialize import materialize_formula_scenario_for_ensemble
from simulation_parquet_bundle import bundle_exists, manifest_path

SIM_META_KEYS = frozenset(
    {
        "display_name",
        "description",
        "charts_to_display",
        "event_markers",
        "chart_stacks",
        "chart_panel_height",
        "chart_panel_opacity",
        "chart_card_width",
        "chart_sample_default",
        "view_mode",
        "simulation_speed",
    }
)


def sanitize_design_name(name: str) -> str:
    s = (name or "").strip().lower()
    s = re.sub(r"[^\w\-]+", "_", s)
    return s.strip("_") or "design"


def locate_design_dir(display_or_dir: str) -> tuple[str, str]:
    """Return (catalog_rel, abs_dir) for a design display name or directory leaf."""
    want = display_or_dir.strip()
    want_leaf = sanitize_design_name(want)

    if os.path.isdir(os.path.join(DESIGNS, want_leaf)):
        return want_leaf, os.path.join(DESIGNS, want_leaf)

    for dirpath, _dirnames, filenames in os.walk(DESIGNS):
        for fn in filenames:
            if not fn.endswith(".conf.json"):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                with open(fp, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
            except Exception:
                continue
            leaf = fn[: -len(".conf.json")]
            if data.get("name") == want or leaf == want_leaf:
                rel = os.path.relpath(dirpath, DESIGNS).replace("\\", "/")
                catalog = rel if rel != "." else leaf
                if catalog.endswith(f"/{leaf}"):
                    catalog = catalog[: -len(f"/{leaf}")]
                if not catalog or catalog == ".":
                    catalog = leaf
                return catalog, dirpath
    raise FileNotFoundError(f"Design not found: {display_or_dir!r}")


def load_json(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return data


def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2)
        fp.write("\n")


def formula_derived_names(design_dir: str) -> list[str]:
    man = os.path.join(design_dir, "formula.data", "manifest.json")
    if not os.path.isfile(man):
        return []
    with open(man, "r", encoding="utf-8") as fp:
        cols = json.load(fp).get("columns") or []
    return [str(c) for c in cols if str(c) not in ("t", "time", "Time (s)")]


def ensemble_derived_names(ensemble_doc: dict[str, Any], ensemble_id: str = "all_") -> list[str]:
    for ent in ensemble_doc.get("ensembles") or []:
        if not isinstance(ent, dict):
            continue
        eid = str(ent.get("id") or ent.get("name") or "").strip()
        if eid == ensemble_id:
            dv = (ent.get("chart_panel") or {}).get("derived_variables") or []
            return [str(x.get("name")) for x in dv if isinstance(x, dict) and x.get("name")]
    return []


def pick_ensemble_source(
    src_dir: str,
    src_ens_path: str,
    fallback: Optional[str],
) -> tuple[dict[str, Any], str]:
    src_ens = load_json(src_ens_path)
    if src_ens.get("ensembles"):
        return src_ens, os.path.basename(src_ens_path)

    fb_catalog, fb_dir = locate_design_dir(fallback or "statcom05")
    fb_path = os.path.join(fb_dir, f"{os.path.basename(fb_dir.rstrip(os.sep))}.ensemble.json")
    fb_ens = load_json(fb_path)
    if not fb_ens.get("ensembles"):
        raise ValueError(
            f"Source ensemble is empty ({src_ens_path}) and fallback {fb_path} is also empty."
        )

    src_formula = set(formula_derived_names(src_dir))
    fb_names = set(ensemble_derived_names(fb_ens))
    if src_formula and not src_formula.issubset(fb_names):
        print(
            f"WARNING: fallback ensemble derived names {sorted(fb_names)} "
            f"do not fully cover source formula columns {sorted(src_formula)}"
        )
    print(
        f"NOTE: {os.path.basename(src_ens_path)} is empty on disk; "
        f"using ensemble from {fb_catalog} ({fb_path})."
    )
    return copy.deepcopy(fb_ens), fb_path


def filter_members_for_dest(ensemble_entry: dict[str, Any], dest_dir: str) -> list[str]:
    members = ensemble_entry.get("member_simulations") or ensemble_entry.get("members") or []
    kept: list[str] = []
    missing: list[str] = []
    for sid in members:
        sid = str(sid).strip()
        if not sid:
            continue
        if bundle_exists(dest_dir, sid) and os.path.isfile(os.path.join(dest_dir, f"{sid}.sim.json")):
            kept.append(sid)
        else:
            missing.append(sid)
    if missing:
        print(f"WARNING: dropping {len(missing)} ensemble members missing data in destination:")
        for sid in missing[:12]:
            print(f"  - {sid}")
        if len(missing) > 12:
            print(f"  ... and {len(missing) - 12} more")
    ensemble_entry["member_simulations"] = kept
    return kept


def merge_conf(source_conf: dict[str, Any], dest_name: str) -> dict[str, Any]:
    merged = copy.deepcopy(source_conf)
    merged["name"] = dest_name
    return merged


def copy_sim_metadata(src_dir: str, dest_dir: str) -> int:
    updated = 0
    for fn in os.listdir(src_dir):
        if not fn.endswith(".sim.json"):
            continue
        sid = fn[: -len(".sim.json")]
        src_fp = os.path.join(src_dir, fn)
        dest_fp = os.path.join(dest_dir, fn)
        if not os.path.isfile(dest_fp):
            continue
        src_sim = load_json(src_fp)
        dest_sim = load_json(dest_fp)
        patch: dict[str, Any] = {}
        for key in SIM_META_KEYS:
            if key in src_sim:
                patch[key] = copy.deepcopy(src_sim[key])
        # Preserve destination row/column counts from actual data bundle.
        if bundle_exists(dest_dir, sid):
            try:
                with open(manifest_path(dest_dir, sid), "r", encoding="utf-8") as mf:
                    man = json.load(mf)
                patch["data_row_count"] = man.get("row_count")
                patch["data_column_count"] = len(man.get("columns") or [])
            except Exception:
                pass
        if not patch:
            continue
        dest_sim.update(patch)
        write_json(dest_fp, dest_sim)
        updated += 1
    return updated


def clone_design_config(
    source: str,
    dest: str,
    *,
    ensemble_id: str = "all_",
    ensemble_fallback: Optional[str] = "statcom05",
    dest_display_name: Optional[str] = None,
    materialize: bool = True,
) -> None:
    src_catalog, src_dir = locate_design_dir(source)
    dst_catalog, dst_dir = locate_design_dir(dest)
    src_leaf = os.path.basename(src_dir.rstrip(os.sep))
    dst_leaf = os.path.basename(dst_dir.rstrip(os.sep))

    src_conf_path = os.path.join(src_dir, f"{src_leaf}.conf.json")
    dst_conf_path = os.path.join(dst_dir, f"{dst_leaf}.conf.json")
    src_ens_path = os.path.join(src_dir, f"{src_leaf}.ensemble.json")
    dst_ens_path = os.path.join(dst_dir, f"{dst_leaf}.ensemble.json")

    src_conf = load_json(src_conf_path)
    dest_name = dest_display_name or load_json(dst_conf_path).get("name") or dest
    merged_conf = merge_conf(src_conf, dest_name)
    write_json(dst_conf_path, merged_conf)
    print(f"Wrote conf: {dst_conf_path}")

    ens_doc, ens_source = pick_ensemble_source(src_dir, src_ens_path, ensemble_fallback)
    target = None
    for ent in ens_doc.get("ensembles") or []:
        if isinstance(ent, dict) and str(ent.get("id") or ent.get("name") or "").strip() == ensemble_id:
            target = ent
            break
    if target is None and ens_doc.get("ensembles"):
        target = ens_doc["ensembles"][0]
        ensemble_id = str(target.get("id") or target.get("name") or ensemble_id)
        print(f"NOTE: using ensemble id {ensemble_id!r}")

    if target is None:
        raise ValueError("No ensemble entry found to clone")

    filter_members_for_dest(target, dst_dir)
    write_json(dst_ens_path, ens_doc)
    print(f"Wrote ensemble ({len(target.get('member_simulations') or [])} members) from {ens_source}: {dst_ens_path}")

    sim_updates = copy_sim_metadata(src_dir, dst_dir)
    print(f"Updated {sim_updates} scenario .sim.json metadata files (charts empty in source — ensemble holds plots).")

    if not materialize:
        print("Skipped formula materialize (--no-materialize).")
        return

    result = materialize_formula_scenario_for_ensemble(
        dst_dir,
        dst_catalog,
        ensemble_id,
        dst_ens_path,
        formula_sim_id="formula",
    )
    if result.get("skipped"):
        print(f"Formula materialize skipped: {result.get('reason')}")
    else:
        print(
            "Materialized formula scenario:",
            f"rows={result.get('row_count')}",
            f"columns={result.get('column_count')}",
            f"dir={result.get('bundle_dir')}",
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Clone design config without Parquet data.")
    parser.add_argument("source", help="Source design display name or directory (e.g. statcomPartha)")
    parser.add_argument("dest", help="Destination design (e.g. HabLight)")
    parser.add_argument(
        "--ensemble-fallback",
        default="statcom05",
        help="When source .ensemble.json is empty, copy ensemble from this design (default: statcom05)",
    )
    parser.add_argument("--ensemble-id", default="all_", help="Ensemble id to materialize (default: all_)")
    parser.add_argument("--dest-name", default=None, help="Override destination display name in conf")
    parser.add_argument("--no-materialize", action="store_true", help="Skip formula Parquet materialize step")
    args = parser.parse_args()

    clone_design_config(
        args.source,
        args.dest,
        ensemble_id=args.ensemble_id,
        ensemble_fallback=args.ensemble_fallback,
        dest_display_name=args.dest_name,
        materialize=not args.no_materialize,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
