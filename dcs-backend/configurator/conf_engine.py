"""
Deterministic synthetic configurator engine (Python mirror of frontend prototype).
"""

from __future__ import annotations

import json
import math
from typing import Any

TECHNOLOGIES: dict[str, dict[str, Any]] = {
    "heavyDutyGT": {"label": "Heavy Duty GT", "fullLabel": "Heavy-Duty Gas Turbine", "defaultLcoe": 72, "defaultCf": 0.88, "carbon": 850, "cfeClass": "Fossil"},
    "aeroderivativeGT": {"label": "Aero GT", "fullLabel": "Aeroderivative Gas Turbine", "defaultLcoe": 95, "defaultCf": 0.24, "carbon": 820, "cfeClass": "Fossil"},
    "solar": {"label": "Solar", "fullLabel": "Solar", "defaultLcoe": 38, "defaultCf": 0.27, "carbon": 0, "cfeClass": "Carbon-Free"},
    "wind": {"label": "Wind", "fullLabel": "Wind", "defaultLcoe": 42, "defaultCf": 0.39, "carbon": 0, "cfeClass": "Carbon-Free"},
    "battery": {"label": "Battery", "fullLabel": "Battery Energy Storage", "defaultLcoe": 110, "defaultCf": None, "carbon": 12, "cfeClass": "Storage", "durationH": 4},
    "fuelCell": {"label": "Fuel Cell", "fullLabel": "Fuel Cell", "defaultLcoe": 105, "defaultCf": 0.72, "carbon": 420, "cfeClass": "Low-Carbon"},
    "recipEngine": {"label": "Recip Engine", "fullLabel": "Reciprocating Engine", "defaultLcoe": 88, "defaultCf": 0.35, "carbon": 780, "cfeClass": "Fossil"},
}

STATES: dict[str, dict[str, Any]] = {
    "texas": {"label": "Texas", "solar": 0.62, "wind": 1.0, "lcoeFactor": 1.0, "carbonFactor": 1.0},
    "arizona": {"label": "Arizona", "solar": 1.0, "wind": 0.32, "lcoeFactor": 0.96, "carbonFactor": 0.94},
    "california": {"label": "California", "solar": 1.0, "wind": 0.62, "lcoeFactor": 1.12, "carbonFactor": 0.88},
    "virginia": {"label": "Virginia", "solar": 0.62, "wind": 0.62, "lcoeFactor": 1.05, "carbonFactor": 1.02},
    "iowa": {"label": "Iowa", "solar": 0.32, "wind": 1.0, "lcoeFactor": 0.94, "carbonFactor": 0.97},
    "nevada": {"label": "Nevada", "solar": 1.0, "wind": 0.62, "lcoeFactor": 0.98, "carbonFactor": 0.93},
    "new_york": {"label": "New York", "solar": 0.32, "wind": 0.62, "lcoeFactor": 1.14, "carbonFactor": 0.9},
}

CITIES: dict[str, dict[str, str]] = {
    "dallas_tx": {"label": "Dallas, TX", "stateId": "texas"},
    "houston_tx": {"label": "Houston, TX", "stateId": "texas"},
    "phoenix_az": {"label": "Phoenix, AZ", "stateId": "arizona"},
    "las_vegas_nv": {"label": "Las Vegas, NV", "stateId": "nevada"},
    "northern_virginia": {"label": "Northern Virginia", "stateId": "virginia"},
    "san_jose_ca": {"label": "San Jose, CA", "stateId": "california"},
    "des_moines_ia": {"label": "Des Moines, IA", "stateId": "iowa"},
    "schenectady_ny": {"label": "Schenectady, NY", "stateId": "new_york"},
}

RELIABILITY_MARGINS = {99.9: 1.08, 99.99: 1.15, 99.999: 1.26}


def _hash_inputs(inputs: dict[str, Any]) -> int:
    key = json.dumps(
        {
            "loadMW": inputs["loadMW"],
            "stateId": inputs["stateId"],
            "cityId": inputs["cityId"],
            "reliabilityTarget": inputs["reliabilityTarget"],
            "cfeTarget": inputs.get("cfeTarget") if inputs.get("cfeTarget") is not None else inputs.get("minCfePercent", 0),
            "minCfePercent": inputs.get("minCfePercent") if inputs.get("minCfePercent") is not None else inputs.get("cfeTarget", 0),
            "technologies": sorted(inputs.get("technologies") or []),
        },
        sort_keys=True,
    )
    h = 2166136261
    for ch in key:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return abs(h)


def _jitter(seed: int, index: int, amplitude: float = 0.04) -> float:
    x = math.sin(seed * 0.0001 + index * 12.9898) * 43758.5453
    return (x - math.floor(x) - 0.5) * 2 * amplitude


def _nearest_reliability(target: float) -> float:
    keys = list(RELIABILITY_MARGINS.keys())
    return min(keys, key=lambda k: abs(k - target))


def run_configurator_engine(inputs: dict[str, Any]) -> dict[str, Any]:
    inputs = dict(inputs)
    min_cfe = inputs.get("minCfePercent")
    cfe_target = inputs.get("cfeTarget")
    if cfe_target is None:
        cfe_target = min_cfe if min_cfe is not None else 0
    if min_cfe is None:
        min_cfe = cfe_target
    inputs["cfeTarget"] = cfe_target
    inputs["minCfePercent"] = min_cfe
    inputs["gridConnectionMode"] = inputs.get("gridConnectionMode", "grid-connected")
    inputs.setdefault("stateId", "texas")
    inputs.setdefault("cityId", "dallas_tx")
    allowed = set(inputs.get("technologies") or [])
    if not allowed:
        return {"ok": False, "error": "Select at least one technology."}

    seed = _hash_inputs(inputs)
    state = STATES.get(inputs["stateId"], STATES["texas"])
    city = CITIES.get(inputs["cityId"], {"label": inputs["cityId"]})
    profile = {
        "solarWeight": state["solar"],
        "windWeight": state["wind"],
        "lcoeFactor": state["lcoeFactor"],
        "carbonFactor": state["carbonFactor"],
        "solarResource": "High" if state["solar"] >= 0.9 else "Medium" if state["solar"] >= 0.55 else "Low",
        "windResource": "High" if state["wind"] >= 0.9 else "Medium" if state["wind"] >= 0.55 else "Low",
    }

    cfe_frac = inputs["cfeTarget"] / 100
    rel_key = _nearest_reliability(inputs["reliabilityTarget"])
    margin = RELIABILITY_MARGINS[rel_key]
    base_total = inputs["loadMW"] * margin

    has = {tid: tid in allowed for tid in TECHNOLOGIES}
    solar_w = profile["solarWeight"] if has["solar"] else 0
    wind_w = profile["windWeight"] if has["wind"] else 0
    ren_w = solar_w + wind_w

    solar_share = wind_share = 0.0
    if ren_w > 0:
        solar_share = (cfe_frac * 0.55 * solar_w) / ren_w
        wind_share = (cfe_frac * 0.55 * wind_w) / ren_w

    battery_share = 0.0
    if has["battery"]:
        battery_share = min(0.14, 0.04 + cfe_frac * 0.08 + (0.03 if rel_key >= 99.999 else 0))

    dispatchable_share = max(0.12, 1 - solar_share - wind_share - battery_share)
    dispatchable_ids = [tid for tid in ("heavyDutyGT", "aeroderivativeGT", "fuelCell", "recipEngine") if has[tid]]
    if not dispatchable_ids and dispatchable_share > 0:
        return {"ok": False, "error": "No dispatchable technology selected. Enable at least one firm generation source."}

    shares = {tid: 0.0 for tid in TECHNOLOGIES}
    for idx, tid in enumerate(dispatchable_ids):
        portion = dispatchable_share / len(dispatchable_ids)
        shares[tid] = max(0.0, portion + _jitter(seed, idx + 10, 0.06))

    shares["solar"] = max(0.0, solar_share + _jitter(seed, 1)) if has["solar"] else 0
    shares["wind"] = max(0.0, wind_share + _jitter(seed, 2)) if has["wind"] else 0
    shares["battery"] = max(0.0, battery_share + _jitter(seed, 3)) if has["battery"] else 0

    sum_shares = sum(shares.values()) or 1
    capacities = {tid: round((shares[tid] / sum_shares) * base_total) if tid in allowed else 0 for tid in TECHNOLOGIES}

    rows = []
    total_energy = cfe_energy = weighted_lcoe = weighted_carbon = 0.0
    for idx, (tid, mw) in enumerate(capacities.items()):
        if mw <= 0 or tid not in allowed:
            continue
        tech = TECHNOLOGIES[tid]
        cf = tech["defaultCf"]
        utilization = None
        if tid == "battery":
            cf = None
            utilization = 1.2 + _jitter(seed, idx + 20, 0.15) + inputs["cfeTarget"] * 0.008
        elif tid == "solar":
            cf = tech["defaultCf"] * (0.85 + profile["solarWeight"] * 0.2) + _jitter(seed, idx + 21, 0.02)
        elif tid == "wind":
            cf = tech["defaultCf"] * (0.85 + profile["windWeight"] * 0.2) + _jitter(seed, idx + 22, 0.02)
        elif tid == "aeroderivativeGT":
            cf = max(0.12, 0.18 + (100 - inputs["cfeTarget"]) * 0.003 + _jitter(seed, idx + 23, 0.03))
        else:
            cf = min(0.92, (tech["defaultCf"] or 0.5) + _jitter(seed, idx + 24, 0.03))

        annual = mw * cf * 8760 / 1000 if cf is not None else mw * (utilization or 1) * 2.5 * 365 / 1000
        total_energy += annual
        if tech["cfeClass"] == "Carbon-Free":
            cfe_energy += annual
        if tech["cfeClass"] == "Storage":
            cfe_energy += annual * 0.35

        lcoe = tech["defaultLcoe"] * profile["lcoeFactor"] * (1 + (inputs["reliabilityTarget"] - 99.9) * 0.002)
        weighted_lcoe += lcoe * annual
        weighted_carbon += tech["carbon"] * annual
        battery_mwh = mw * tech.get("durationH", 4) if tid == "battery" else None

        rows.append({
            "id": tid,
            "label": tech["label"],
            "fullLabel": tech["fullLabel"],
            "installedMW": mw,
            "batteryMWh": battery_mwh,
            "capacityFactor": cf,
            "utilization": utilization,
            "energyContributionGWh": annual,
            "lcoe": lcoe,
            "cfeClass": tech["cfeClass"],
        })

    rows.sort(key=lambda r: r["installedMW"], reverse=True)
    total_mw = sum(r["installedMW"] for r in rows) or 1
    for r in rows:
        r["energySharePercent"] = (r["energyContributionGWh"] / total_energy * 100) if total_energy else 0
        r["capacitySharePercent"] = r["installedMW"] / total_mw * 100
        r["percent"] = r["capacitySharePercent"]

    dispatch_mw = sum(r["installedMW"] for r in rows if r["id"] in ("heavyDutyGT", "aeroderivativeGT", "fuelCell", "recipEngine"))
    battery_mw = next((r["installedMW"] for r in rows if r["id"] == "battery"), 0)
    overbuild = dispatch_mw / max(inputs["loadMW"], 1)
    achieved_rel = min(99.9999, 99.85 + min(0.12, (overbuild - 1) * 0.35) + min(0.04, battery_mw / inputs["loadMW"] * 0.08) + (margin - 1) * 0.08)
    achieved_rel = max(achieved_rel, inputs["reliabilityTarget"] + 0.001)
    achieved_cfe = (cfe_energy / total_energy * 100) if total_energy else 0
    if inputs["minCfePercent"] > 0:
        achieved_cfe = max(achieved_cfe, inputs["minCfePercent"] + 0.3)

    solar_row = next((r for r in rows if r["id"] == "solar"), None)
    wind_row = next((r for r in rows if r["id"] == "wind"), None)
    ren_energy = sum(r["energyContributionGWh"] for r in rows if r["id"] in ("solar", "wind"))
    solar_curt = max(0.5, (inputs["cfeTarget"] - 40) * 0.06 + profile["solarWeight"] * 2 + _jitter(seed, 50, 0.8)) if solar_row else None
    wind_curt = max(0.3, (inputs["cfeTarget"] - 35) * 0.04 + profile["windWeight"] * 1.2 + _jitter(seed, 51, 0.6)) if wind_row else None
    total_ren_curt = (
        (solar_curt * (solar_row["energyContributionGWh"] if solar_row else 0) + wind_curt * (wind_row["energyContributionGWh"] if wind_row else 0))
        / ren_energy
        if ren_energy and solar_curt is not None and wind_curt is not None
        else 0
    )
    curtailed = ren_energy * (total_ren_curt / 100) * (1 + inputs["cfeTarget"] / 200)

    rel_met = achieved_rel >= inputs["reliabilityTarget"] - 0.001
    cfe_met = achieved_cfe >= inputs["cfeTarget"] - 0.5
    notes = []
    if not rel_met:
        notes.append("Consider enabling Battery Energy Storage or additional dispatchable generation.")
    if not cfe_met:
        notes.append("Consider enabling additional renewable technologies or relaxing the CFE target.")

    total_installed = sum(capacities.values())
    summary = (
        f"A {total_installed / 1000:.2f} GW portfolio designed to support a "
        f"{inputs['loadMW'] / 1000:.2f} GW {state['label']} data center at a "
        f"{inputs['reliabilityTarget']}% reliability target and {inputs['cfeTarget']}% CFE target."
    )

    return {
        "ok": True,
        "synthetic": True,
        "inputs": inputs,
        "location": {
            "state": state["label"],
            "city": city["label"],
            "solarResource": profile["solarResource"],
            "windResource": profile["windResource"],
        },
        "summary": summary,
        "totalInstalledMW": total_installed,
        "supplyMix": rows,
        "kpis": {
            "installedCapacityMW": total_installed,
            "achievedReliability": achieved_rel,
            "reliabilityTarget": inputs["reliabilityTarget"],
            "achievedCfe": achieved_cfe,
            "cfeTarget": inputs["cfeTarget"],
            "lcoe": round(weighted_lcoe / total_energy) if total_energy else 0,
            "carbonIntensity": round(weighted_carbon / total_energy) if total_energy else 0,
        },
        "capacityFactors": [
            {"id": r["id"], "label": r["label"], "capacityFactor": r["capacityFactor"], "utilization": r["utilization"]}
            for r in rows
        ],
        "curtailment": {
            "solarCurtailmentPercent": round(solar_curt, 1) if solar_curt is not None else None,
            "windCurtailmentPercent": round(wind_curt, 1) if wind_curt is not None else None,
            "totalRenewableCurtailmentPercent": round(total_ren_curt, 1),
            "curtailedGWh": round(curtailed, 1),
            "renewableAvailableGWh": round(ren_energy + curtailed, 1),
            "renewableUsedGWh": round(ren_energy, 1),
        },
        "annualGenerationGWh": round(total_energy, 1),
        "targets": {"relMet": rel_met, "cfeMet": cfe_met, "loadMet": True, "notes": notes},
        "seed": seed,
    }
