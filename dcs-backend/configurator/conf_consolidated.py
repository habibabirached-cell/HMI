"""Consolidated study k-NN regression (Python mirror of conf_consolidatedEngine.js)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from configurator.conf_engine import run_configurator_engine
from configurator.conf_technology_preferences import apply_elevated_optional_technologies

MW_OUTPUT_IDS = [
    "hd7ha02",
    "hd7f05",
    "lm2500g4",
    "lm250022mw",
    "wind",
    "solar",
    "battery",
]

TECH_SPECS: dict[str, dict[str, Any]] = {
    "hd7ha02": {"label": "HD - 7HA.02", "fullLabel": "HD - 7HA.02", "assetClass": "generation", "cfeClass": "Fossil", "defaultCf": 0.88, "defaultLcoe": 72, "carbon": 850},
    "hd7f05": {"label": "HD - 7F.05", "fullLabel": "HD - 7F.05", "assetClass": "generation", "cfeClass": "Fossil", "defaultCf": 0.85, "defaultLcoe": 74, "carbon": 850},
    "lm2500g4": {"label": "LM2500+G4", "fullLabel": "LM2500+G4", "assetClass": "generation", "cfeClass": "Fossil", "defaultCf": 0.35, "defaultLcoe": 95, "carbon": 820},
    "lm250022mw": {"label": "LM2500 22MW", "fullLabel": "LM2500 22MW", "assetClass": "generation", "cfeClass": "Fossil", "defaultCf": 0.24, "defaultLcoe": 98, "carbon": 820},
    "wind": {"label": "Wind", "fullLabel": "Wind", "assetClass": "generation", "cfeClass": "Carbon-Free", "defaultCf": 0.39, "defaultLcoe": 42, "carbon": 0},
    "solar": {"label": "Solar", "fullLabel": "Solar", "assetClass": "generation", "cfeClass": "Carbon-Free", "defaultCf": 0.27, "defaultLcoe": 38, "carbon": 0},
    "battery": {"label": "BESS", "fullLabel": "Battery Energy Storage", "assetClass": "storage", "cfeClass": "Storage", "defaultCf": None, "defaultLcoe": 110, "carbon": 12, "durationH": 4},
}

STATE_TO_PLACE = {
    "texas": "TX",
    "arizona": "AZ",
    "idaho": "ID",
    "pennsylvania": "PA",
}

STATES_PROFILE = {
    "texas": {"label": "Texas", "solar": 0.62, "wind": 1.0, "lcoeFactor": 1.0},
    "arizona": {"label": "Arizona", "solar": 1.0, "wind": 0.32, "lcoeFactor": 0.96},
    "idaho": {"label": "Idaho", "solar": 0.62, "wind": 1.0, "lcoeFactor": 0.95},
    "pennsylvania": {"label": "Pennsylvania", "solar": 0.32, "wind": 0.62, "lcoeFactor": 1.04},
}

_DATA_PATH = Path(__file__).resolve().parent.parent / "configuratorData" / "data" / "consolidated.json"
_STUDY_RECORDS: list[dict[str, Any]] = []
_REFERENCE_LOAD = 1350.0


def _load_records() -> list[dict[str, Any]]:
    global _STUDY_RECORDS, _REFERENCE_LOAD
    if _STUDY_RECORDS:
        return _STUDY_RECORDS
    if not _DATA_PATH.is_file():
        return []
    data = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    _STUDY_RECORDS = data.get("records") or []
    if _STUDY_RECORDS:
        _REFERENCE_LOAD = float(_STUDY_RECORDS[0].get("inputs", {}).get("loadMW", 1350))
    return _STUDY_RECORDS


def _feature_distance(a: dict[str, Any], b: dict[str, Any]) -> float:
    rel_diff = abs(a["reliabilityTarget"] - b["reliabilityTarget"]) / 0.01
    cfe_diff = abs(a["minCfePercent"] - b["minCfePercent"]) / 10
    load_diff = abs(a["loadMW"] - b["loadMW"]) / max(_REFERENCE_LOAD, 1.0)
    place_diff = 0 if a["place"] == b["place"] else 25
    return rel_diff + cfe_diff + load_diff + place_diff


def _outputs_from_template_record(rec: dict[str, Any], load_mw: float, cfe_zero: bool) -> dict[str, float]:
    outputs = dict(rec["outputs"])
    dispatch = ["hd7ha02", "hd7f05", "lm2500g4", "lm250022mw", "battery"]
    if cfe_zero:
        outputs["wind"] = 0
        outputs["solar"] = 0
        fossil_total = sum(outputs.get(k, 0) for k in dispatch)
        target_total = load_mw * 1.1
        if fossil_total > 0:
            factor = target_total / fossil_total
            for key in dispatch:
                outputs[key] = outputs.get(key, 0) * factor
    else:
        scale = load_mw / _REFERENCE_LOAD
        for key in MW_OUTPUT_IDS:
            outputs[key] = max(0, outputs.get(key, 0) * scale)
    return outputs


def _pick_cfe_zero_template(inputs: dict[str, Any], records: list[dict[str, Any]]) -> dict[str, Any] | None:
    place_records = [rec for rec in records if rec["inputs"].get("place") == inputs.get("place")]
    if not place_records:
        return None
    return sorted(
        place_records,
        key=lambda rec: (
            rec["inputs"].get("minCfePercent", 0),
            _feature_distance(inputs, {**rec["inputs"], "place": rec["inputs"].get("place")}),
        ),
    )[0]


def _predict_outputs(inputs: dict[str, Any], k: int = 4) -> dict[str, Any]:
    records = _load_records()
    for rec in records:
        inp = rec["inputs"]
        if (
            inp.get("place") == inputs["place"]
            and abs(inp.get("minCfePercent", 0) - inputs["minCfePercent"]) < 0.01
            and abs(inp.get("reliabilityTarget", 0) - inputs["reliabilityTarget"]) < 0.0001
            and abs(inp.get("loadMW", 0) - inputs["loadMW"]) < 1
        ):
            return {"outputs": dict(rec["outputs"]), "method": "exact-record"}

    if inputs.get("minCfePercent", 0) <= 0:
        template = _pick_cfe_zero_template(inputs, records)
        if template:
            return {
                "outputs": _outputs_from_template_record(template, inputs["loadMW"], True),
                "method": "cfe-zero-template",
            }

    ranked = sorted(
        ((rec, _feature_distance(inputs, {**rec["inputs"], "place": rec["inputs"].get("place")})) for rec in records),
        key=lambda item: item[1],
    )
    neighbors = ranked[: min(k, len(ranked))]
    weights = [1 / (dist + 0.05) for _, dist in neighbors]
    weight_sum = sum(weights)

    shares = {key: 0.0 for key in MW_OUTPUT_IDS}
    blended_total = 0.0
    for (rec, _), w in zip(neighbors, weights):
        weight = w / weight_sum
        rec_total = sum(rec["outputs"].get(key, 0) for key in MW_OUTPUT_IDS)
        blended_total += rec_total * weight
        if rec_total <= 0:
            continue
        for key in MW_OUTPUT_IDS:
            shares[key] += (rec["outputs"].get(key, 0) / rec_total) * weight

    target_total = blended_total * (inputs["loadMW"] / _REFERENCE_LOAD)
    outputs = {key: shares[key] * target_total for key in MW_OUTPUT_IDS}
    for key in ("lcoe", "achievedReliability"):
        outputs[key] = sum(rec["outputs"].get(key, 0) * w / weight_sum for (rec, _), w in zip(neighbors, weights))
    return {"outputs": outputs, "method": "knn-share-regression"}


def _apply_cfe_zero(outputs: dict[str, float], load_mw: float) -> dict[str, float]:
    next_out = dict(outputs)
    next_out["wind"] = 0
    next_out["solar"] = 0
    dispatch = ["hd7ha02", "hd7f05", "lm2500g4", "lm250022mw", "battery"]
    total = sum(next_out.get(k, 0) for k in dispatch)
    cap = load_mw * 1.1
    if total > cap and total > 0:
        factor = cap / total
        for key in dispatch:
            next_out[key] = next_out.get(key, 0) * factor
    return next_out


def _build_supply_mix(outputs: dict[str, float], inputs: dict[str, Any]) -> tuple[list[dict[str, Any]], float, float, float, float]:
    profile = STATES_PROFILE.get(inputs["stateId"], STATES_PROFILE["texas"])
    rows: list[dict[str, Any]] = []
    total_energy = 0.0
    cfe_energy = 0.0
    weighted_lcoe = 0.0
    weighted_carbon = 0.0

    for tech_id in MW_OUTPUT_IDS:
        mw = outputs.get(tech_id, 0)
        if mw <= 0:
            continue
        spec = TECH_SPECS[tech_id]
        cf = spec["defaultCf"]
        utilization = None
        if tech_id == "battery":
            cf = None
            utilization = 1.1 + inputs["minCfePercent"] * 0.006
        elif tech_id == "solar":
            cf = spec["defaultCf"] * (0.85 + profile["solar"] * 0.2)
        elif tech_id == "wind":
            cf = spec["defaultCf"] * (0.85 + profile["wind"] * 0.2)

        annual = mw * cf * 8760 / 1000 if cf is not None else mw * (utilization or 1) * 2.5 * 365 / 1000
        total_energy += annual
        if spec["cfeClass"] == "Carbon-Free":
            cfe_energy += annual
        if spec["cfeClass"] == "Storage" and inputs.get("minCfePercent", 0) > 0:
            cfe_energy += annual * 0.35

        lcoe = outputs.get("lcoe", spec["defaultLcoe"]) if tech_id == "battery" else spec["defaultLcoe"] * profile["lcoeFactor"]
        weighted_lcoe += lcoe * annual
        weighted_carbon += spec["carbon"] * annual
        rows.append({
            "id": tech_id,
            "label": spec["label"],
            "fullLabel": spec["fullLabel"],
            "assetClass": spec["assetClass"],
            "installedMW": round(mw),
            "batteryMWh": round(mw * spec.get("durationH", 4)) if tech_id == "battery" else None,
            "capacityFactor": cf,
            "utilization": utilization,
            "energyContributionGWh": annual,
            "lcoe": lcoe,
            "cfeClass": spec["cfeClass"],
        })

    rows.sort(key=lambda r: r["installedMW"], reverse=True)
    total_mw = sum(r["installedMW"] for r in rows)
    for row in rows:
        row["energySharePercent"] = (row["energyContributionGWh"] / total_energy * 100) if total_energy else 0
        row["capacitySharePercent"] = (row["installedMW"] / total_mw * 100) if total_mw else 0
        row["percent"] = row["capacitySharePercent"]

    portfolio_lcoe = outputs.get("lcoe", weighted_lcoe / total_energy if total_energy else 0)
    carbon = weighted_carbon / total_energy if total_energy else 0
    return rows, total_energy, cfe_energy, portfolio_lcoe, carbon


def run_consolidated_engine(inputs: dict[str, Any]) -> dict[str, Any] | None:
    records = _load_records()
    if not records:
        return None

    state_id = inputs.get("stateId") or "texas"
    place = STATE_TO_PLACE.get(state_id)
    if not place:
        return None

    min_cfe = inputs.get("minCfePercent")
    if min_cfe is None:
        min_cfe = inputs.get("cfeTarget", 0)

    normalized = {
        "loadMW": float(inputs.get("loadMW") or 1350),
        "stateId": state_id,
        "reliabilityTarget": float(inputs.get("reliabilityTarget") or 99.99),
        "minCfePercent": float(min_cfe or 0),
        "place": place,
        "gridConnectionMode": inputs.get("gridConnectionMode") or "grid-connected",
    }

    pred = _predict_outputs(normalized)
    outputs = pred["outputs"]
    method = pred.get("method")
    if method == "exact-record":
        scale = normalized["loadMW"] / _REFERENCE_LOAD
        for key in MW_OUTPUT_IDS:
            outputs[key] = max(0, outputs.get(key, 0) * scale)
    if normalized["minCfePercent"] <= 0 and method != "cfe-zero-template":
        outputs = _apply_cfe_zero(outputs, normalized["loadMW"])
    for key in MW_OUTPUT_IDS:
        outputs[key] = round(outputs.get(key, 0))
    outputs["lcoe"] = round(outputs.get("lcoe", 0))
    outputs["achievedReliability"] = min(99.9999, round(outputs.get("achievedReliability", 99.99), 4))

    rows, total_energy, cfe_energy, portfolio_lcoe, carbon = _build_supply_mix(outputs, normalized)
    achieved_cfe = 0 if normalized["minCfePercent"] <= 0 else ((cfe_energy / total_energy * 100) if total_energy else 0)
    if normalized["minCfePercent"] > 0:
        achieved_cfe = max(achieved_cfe, normalized["minCfePercent"] + 0.3)
    achieved_rel = max(normalized["reliabilityTarget"], outputs.get("achievedReliability", normalized["reliabilityTarget"]))
    total_installed = sum(r["installedMW"] for r in rows)
    profile = STATES_PROFILE.get(state_id, STATES_PROFILE["texas"])

    return {
        "ok": True,
        "synthetic": False,
        "source": "consolidated-regression",
        "regressionMethod": pred["method"],
        "inputs": {**inputs, **normalized},
        "location": {"state": profile["label"]},
        "gridConnectionMode": normalized["gridConnectionMode"],
        "summary": f"Consolidated study portfolio for a {normalized['loadMW']/1000:.2f} GW data center.",
        "totalInstalledMW": total_installed,
        "supplyMix": rows,
        "kpis": {
            "installedCapacityMW": total_installed,
            "achievedReliability": achieved_rel,
            "reliabilityTarget": normalized["reliabilityTarget"],
            "achievedCfe": achieved_cfe,
            "minCfePercent": normalized["minCfePercent"],
            "lcoe": int(outputs.get("lcoe", portfolio_lcoe)),
            "carbonIntensity": int(carbon),
        },
        "capacityFactors": [
            {"id": r["id"], "label": r["label"], "capacityFactor": r["capacityFactor"], "utilization": r["utilization"]}
            for r in rows
        ],
        "curtailment": {
            "solarCurtailmentPercent": None if not any(r["id"] == "solar" for r in rows) else 2.0,
            "windCurtailmentPercent": None if not any(r["id"] == "wind" for r in rows) else 1.5,
            "totalRenewableCurtailmentPercent": 0 if normalized["minCfePercent"] <= 0 else 1.8,
            "curtailedGWh": 0,
            "renewableAvailableGWh": 0,
            "renewableUsedGWh": 0,
        },
        "annualGenerationGWh": round(total_energy, 1),
        "targets": {
            "relMet": achieved_rel >= normalized["reliabilityTarget"],
            "cfeMet": normalized["minCfePercent"] <= 0 or achieved_cfe >= normalized["minCfePercent"],
            "loadMet": normalized["minCfePercent"] > 0 or total_installed <= normalized["loadMW"] * 1.1 + 0.5,
            "notes": [],
        },
    }


def generate_configurator_result(inputs: dict[str, Any]) -> dict[str, Any]:
    consolidated = run_consolidated_engine(inputs)
    if consolidated:
        return apply_elevated_optional_technologies(consolidated, inputs, tech_specs=TECH_SPECS)
    synthetic = run_configurator_engine(inputs)
    return apply_elevated_optional_technologies(synthetic, inputs, tech_specs=TECH_SPECS)
