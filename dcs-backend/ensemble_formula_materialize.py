"""
Materialize ensemble chart_panel.derived_variables into a normal scenario
`formula` (default id) with formula.data/ Parquet bundle + formula.sim.json.

Matches browser evaluation in dcs-ui/src/utils/formulaEvaluator.js and
qualifyEnsembleColumn in simulationLazyApi.js (ENSEMBLE_COLUMN_SEP).
"""

from __future__ import annotations

import json
import math
import os
import re
from typing import Any, Optional

import pandas as pd

from simulation_parquet_bundle import read_bundle_dataframe, scenario_data_dir, write_bundle_from_dataframe

# Same as dcs-ui ENSEMBLE_COLUMN_SEP: space, EM DASH (U+2014), space
ENSEMBLE_COLUMN_SEP = " \u2014 "

FORMULA_PARQUET_DISPLAY_NAME = "FormulaTattooedInParquet"


def _qualify_ensemble_column(simulation_id: str, column_name: str) -> str:
    sid = (simulation_id or "").strip()
    c = "" if column_name is None else str(column_name)
    if not sid or not c:
        return c
    return f"{sid}{ENSEMBLE_COLUMN_SEP}{c}"


def _evaluate_formula(formula: str, row: dict[str, float]) -> float:
    if not formula or not str(formula).strip():
        return float("nan")
    expr = str(formula).strip()
    scope: dict[str, float] = {}
    for k, v in row.items():
        try:
            num = float(v)
        except (TypeError, ValueError):
            num = 0.0
        if not math.isfinite(num):
            num = 0.0
        scope[k] = num
        tk = k.strip()
        if tk != k:
            scope[tk] = num
    names = sorted(scope.keys(), key=len, reverse=True)
    for name in names:
        val = scope[name]
        safe = str(val) if math.isfinite(val) else "0"
        expr = f"({safe})".join(expr.split(name))

    strip_fn = re.compile(r"\b(Math\.)?(sqrt|abs|sin|cos|log|exp|min|max)\b")
    stripped = strip_fn.sub("", expr)
    stripped = re.sub(r"[\d\s+\-*/().^,eE]+", "", stripped)
    if len(stripped) > 0:
        return float("nan")
    expr = expr.replace("^", "**")
    expr = re.sub(r"\bsqrt\s*\(", "math.sqrt(", expr)
    expr = re.sub(r"\babs\s*\(", "math.abs(", expr)
    expr = re.sub(r"\bsin\s*\(", "math.sin(", expr)
    expr = re.sub(r"\bcos\s*\(", "math.cos(", expr)
    expr = re.sub(r"\blog\s*\(", "math.log(", expr)
    expr = re.sub(r"\bexp\s*\(", "math.exp(", expr)
    expr = re.sub(r"\bmin\s*\(", "min(", expr)
    expr = re.sub(r"\bmax\s*\(", "max(", expr)
    try:
        out = eval(
            expr,
            {"__builtins__": {}},
            {"math": math, "min": min, "max": max},
        )
        if isinstance(out, (int, float)) and math.isfinite(float(out)):
            return float(out)
        return float("nan")
    except Exception:
        return float("nan")


def _time_column_name(df: pd.DataFrame) -> str:
    if df is None or len(df.columns) == 0:
        raise ValueError("Empty DataFrame")
    for c in df.columns:
        cl = str(c).lower().strip()
        if cl in ("time (s)", "time (sec)", "time", "t", "timestamp"):
            return str(c)
    return str(df.columns[0])


def _load_ensemble_and_members(
    ens_path: str, ensemble_id: str
) -> tuple[dict[str, Any], list[str], list[dict[str, Any]]]:
    with open(ens_path, "r", encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, dict):
        raise ValueError("Invalid ensemble file")
    raw = data.get("ensembles")
    if not isinstance(raw, list):
        raise ValueError("Invalid ensemble file: missing ensembles list")
    want = str(ensemble_id).strip()
    target: Optional[dict] = None
    for ent in raw:
        if not isinstance(ent, dict):
            continue
        eid = ent.get("id") or ent.get("name")
        if eid and str(eid).strip() == want:
            target = ent
            break
    if target is None:
        raise ValueError(f"Ensemble not found: {ensemble_id}")
    members = target.get("member_simulations") or target.get("members") or []
    if not members:
        raise ValueError("Ensemble has no member_simulations")
    members = [str(m).strip() for m in members if str(m).strip()]
    chart_panel = target.get("chart_panel") or {}
    dv = chart_panel.get("derived_variables")
    if not isinstance(dv, list):
        dv = []
    return target, members, dv


def _members_referenced_in_formulas(formulas: list[str], members: list[str]) -> list[str]:
    """Member sim ids explicitly referenced as `SimId — column` in one or more formulas."""
    refs: set[str] = set()
    members_sorted = sorted(members, key=len, reverse=True)
    for fml in formulas:
        if not fml:
            continue
        text = str(fml)
        for sid in members_sorted:
            if f"{sid}{ENSEMBLE_COLUMN_SEP}" in text:
                refs.add(sid)
    return [m for m in members if m in refs]


def _resolve_materialize_members(members: list[str], formulas: list[str]) -> list[str]:
    """Members whose Parquet rows define the formula timeline (exclude unrelated short Csv_* tabs)."""
    refs = _members_referenced_in_formulas(formulas, members)
    if refs:
        return refs
    return [members[0]] if members else []


def _load_member_frames(
    dir_path: str, member_ids: list[str]
) -> dict[str, pd.DataFrame]:
    per_member: dict[str, pd.DataFrame] = {}
    for sid in member_ids:
        bundle_root = scenario_data_dir(dir_path, sid)
        if not os.path.isdir(bundle_root):
            raise FileNotFoundError(
                f"Member scenario data not found: {sid}.data/ (Parquet bundle required for materialize)"
            )
        per_member[sid] = read_bundle_dataframe(dir_path, sid)
    return per_member


def materialize_formula_scenario_for_ensemble(
    dir_path: str,
    _catalog_rel: str,
    ensemble_id: str,
    ens_path: str,
    *,
    formula_sim_id: str = "formula",
) -> dict[str, Any]:
    """
    Read member Parquet bundles ({sid}.data/), evaluate ensemble derived_variables, write
    {formula_sim_id}.data/ bundle and .sim.json. Returns metadata dict.
    """
    _e, members, derived_variables = _load_ensemble_and_members(ens_path, ensemble_id)
    if not derived_variables:
        return {"skipped": True, "reason": "no derived_variables in ensemble chart_panel"}

    safe_fid = re.sub(r"[^\w\-]", "", formula_sim_id) or "formula"

    items_valid: list[tuple[str, str]] = []
    for item in derived_variables:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        fml = item.get("formula", "")
        if not name or not str(fml).strip():
            continue
        items_valid.append((name, str(fml)))

    if not items_valid:
        return {"skipped": True, "reason": "no valid derived variable names"}

    all_formulas = [fml for _, fml in items_valid]
    mat_members = _resolve_materialize_members(members, all_formulas)
    per_member = _load_member_frames(dir_path, mat_members)
    n = min(len(df) for df in per_member.values())
    if n <= 0:
        raise ValueError("No data rows in referenced member scenarios")

    primary = mat_members[0]
    primary_df = per_member[primary]
    time_col = _time_column_name(primary_df)

    primary_id = primary
    out_cols: dict[str, list] = {time_col: [primary_df.iloc[i][time_col] for i in range(n)]}
    for idx, (name, fml) in enumerate(items_valid):
        col_vals: list = []
        for i in range(n):
            ev: dict[str, float] = {}
            for sid in mat_members:
                df = per_member[sid]
                for col in df.columns:
                    key = _qualify_ensemble_column(sid, str(col))
                    raw = df.iloc[i][col]
                    try:
                        ev[key] = float(raw)
                    except (TypeError, ValueError):
                        ev[key] = 0.0
            for j in range(idx):
                pn = items_valid[j][0]
                rv = out_cols[pn][i]
                try:
                    pv = float(rv)
                except (TypeError, ValueError):
                    pv = 0.0
                pv = pv if math.isfinite(pv) else 0.0
                ev[pn] = pv
                ev[_qualify_ensemble_column(primary_id, pn)] = pv
            # Same numeric columns as will appear under formula.data — expose as `formula — Name`
            # so chart_panel formulas can reference the materialized scenario id like a member.
            for prev_col in out_cols:
                if prev_col == time_col:
                    continue
                rv = out_cols[prev_col][i]
                try:
                    pv = float(rv)
                except (TypeError, ValueError):
                    pv = 0.0
                pv = pv if math.isfinite(pv) else 0.0
                ev[_qualify_ensemble_column(safe_fid, prev_col)] = pv
            v = _evaluate_formula(str(fml), ev)
            col_vals.append(v if math.isfinite(v) else float("nan"))
        out_cols[name] = col_vals

    out_df = pd.DataFrame(out_cols)
    bundle_root = write_bundle_from_dataframe(out_df, dir_path, safe_fid)
    sim_path_out = os.path.join(dir_path, f"{safe_fid}.sim.json")
    # Merge or create .sim.json (keep existing charts if any)
    if os.path.isfile(sim_path_out):
        with open(sim_path_out, "r", encoding="utf-8") as fp:
            scfg = json.load(fp)
        if not isinstance(scfg, dict):
            scfg = {}
    else:
        scfg = {
            "display_name": FORMULA_PARQUET_DISPLAY_NAME,
            "description": "Materialized ensemble formulas (precomputed from member CSVs).",
            "charts_to_display": [],
            "event_markers": {},
        }
    scfg["display_name"] = FORMULA_PARQUET_DISPLAY_NAME
    scfg["data_row_count"] = int(n)
    scfg["data_column_count"] = int(len(out_df.columns))
    scfg["description"] = (
        scfg.get("description")
        or "Precomputed values from ensemble chart_panel.derived_variables."
    )
    with open(sim_path_out, "w", encoding="utf-8") as fp:
        json.dump(scfg, fp, indent=2, ensure_ascii=False)

    return {
        "ok": True,
        "formula_sim_id": safe_fid,
        "rows": n,
        "columns": int(len(out_df.columns)),
        "bundle_dir": bundle_root,
    }


def materialize_single_derived_variable_for_ensemble(
    dir_path: str,
    _catalog_rel: str,
    ensemble_id: str,
    ens_path: str,
    *,
    variable_name: str,
    formula_sim_id: str = "formula",
) -> dict[str, Any]:
    """
    Incremental materialize: evaluate and append/replace one derived column on the existing
    formula Parquet bundle without recomputing other derived variables.
    """
    _e, members, derived_variables = _load_ensemble_and_members(ens_path, ensemble_id)
    name = str(variable_name or "").strip()
    if not name:
        raise ValueError("variable_name required for incremental materialize")

    fml: Optional[str] = None
    for item in derived_variables:
        if not isinstance(item, dict):
            continue
        if str(item.get("name", "")).strip() == name:
            fml = str(item.get("formula", "")).strip()
            break
    if not fml:
        raise ValueError(
            f"Derived variable {name!r} not found in ensemble chart_panel.derived_variables"
        )

    safe_fid = re.sub(r"[^\w\-]", "", formula_sim_id) or "formula"

    formula_bundle = scenario_data_dir(dir_path, safe_fid)
    if os.path.isdir(formula_bundle):
        existing_df = read_bundle_dataframe(dir_path, safe_fid)
        mat_members_probe = _resolve_materialize_members(members, [fml])
        per_member_probe = _load_member_frames(dir_path, mat_members_probe)
        expected_n = min(len(df) for df in per_member_probe.values())
        if len(existing_df) != expected_n:
            return materialize_formula_scenario_for_ensemble(
                dir_path,
                _catalog_rel,
                ensemble_id,
                ens_path,
                formula_sim_id=formula_sim_id,
            )

    mat_members = _resolve_materialize_members(members, [fml])
    per_member = _load_member_frames(dir_path, mat_members)
    n = min(len(df) for df in per_member.values())
    if n <= 0:
        raise ValueError("No data rows in referenced member scenarios")

    primary = mat_members[0]
    primary_df = per_member[primary]
    time_col = _time_column_name(primary_df)
    primary_id = primary

    if os.path.isdir(formula_bundle):
        existing_df = read_bundle_dataframe(dir_path, safe_fid)
    else:
        existing_df = pd.DataFrame({time_col: [primary_df.iloc[i][time_col] for i in range(n)]})

    if n <= 0:
        raise ValueError("No data rows for incremental materialize")

    col_vals: list = []
    for i in range(n):
        ev: dict[str, float] = {}
        for sid in mat_members:
            df = per_member[sid]
            for col in df.columns:
                key = _qualify_ensemble_column(sid, str(col))
                raw = df.iloc[i][col]
                try:
                    ev[key] = float(raw)
                except (TypeError, ValueError):
                    ev[key] = 0.0
        for col in existing_df.columns:
            if col == time_col or col == name:
                continue
            rv = existing_df.iloc[i][col]
            try:
                pv = float(rv)
            except (TypeError, ValueError):
                pv = 0.0
            pv = pv if math.isfinite(pv) else 0.0
            ev[str(col)] = pv
            ev[_qualify_ensemble_column(primary_id, str(col))] = pv
            ev[_qualify_ensemble_column(safe_fid, str(col))] = pv
        v = _evaluate_formula(fml, ev)
        col_vals.append(v if math.isfinite(v) else float("nan"))

    out_df = existing_df.iloc[:n].copy()
    if time_col not in out_df.columns:
        out_df.insert(0, time_col, [primary_df.iloc[i][time_col] for i in range(n)])
    out_df[name] = col_vals

    bundle_root = write_bundle_from_dataframe(out_df, dir_path, safe_fid)
    sim_path_out = os.path.join(dir_path, f"{safe_fid}.sim.json")
    if os.path.isfile(sim_path_out):
        with open(sim_path_out, "r", encoding="utf-8") as fp:
            scfg = json.load(fp)
        if not isinstance(scfg, dict):
            scfg = {}
    else:
        scfg = {
            "display_name": FORMULA_PARQUET_DISPLAY_NAME,
            "description": "Materialized ensemble formulas (precomputed from member CSVs).",
            "charts_to_display": [],
            "event_markers": {},
        }
    scfg["display_name"] = FORMULA_PARQUET_DISPLAY_NAME
    scfg["data_row_count"] = int(n)
    scfg["data_column_count"] = int(len(out_df.columns))
    scfg["description"] = (
        scfg.get("description")
        or "Precomputed values from ensemble chart_panel.derived_variables."
    )
    with open(sim_path_out, "w", encoding="utf-8") as fp:
        json.dump(scfg, fp, indent=2, ensure_ascii=False)

    return {
        "ok": True,
        "incremental": True,
        "variable_name": name,
        "formula_sim_id": safe_fid,
        "rows": n,
        "columns": int(len(out_df.columns)),
        "bundle_dir": bundle_root,
    }
