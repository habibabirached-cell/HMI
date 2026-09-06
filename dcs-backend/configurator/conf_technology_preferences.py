"""Technology preference helpers (mirror of conf_technologyPreferences.js)."""

from __future__ import annotations

import math
from typing import Any

TECH_PREFERENCE_MUST = "must"
TECH_PREFERENCE_SHOULD = "should"
TECH_PREFERENCE_IF_NECESSARY = "ifNecessary"

ELEVATED_OPTIONAL_TECH_IDS = ("fuelCell", "recipEngine")
ELEVATED_OPTIONAL_SHARE_MIN = 0.5001
ELEVATED_OPTIONAL_SHARE_MAX = 0.9999

OPTIONAL_TECH_SPECS: dict[str, dict[str, Any]] = {
    "fuelCell": {
        "label": "Fuel Cell",
        "fullLabel": "Fuel Cell",
        "assetClass": "generation",
        "cfeClass": "Low-Carbon",
        "defaultCf": 0.72,
        "defaultLcoe": 105,
        "carbon": 420,
    },
    "recipEngine": {
        "label": "Recip Engine",
        "fullLabel": "Reciprocating Engine",
        "assetClass": "generation",
        "cfeClass": "Fossil",
        "defaultCf": 0.35,
        "defaultLcoe": 88,
        "carbon": 780,
    },
}

STATES_PROFILE = {
    "texas": {"lcoeFactor": 1.0},
    "arizona": {"lcoeFactor": 0.96},
    "idaho": {"lcoeFactor": 0.95},
    "pennsylvania": {"lcoeFactor": 1.04},
    "california": {"lcoeFactor": 1.12},
    "virginia": {"lcoeFactor": 1.05},
    "iowa": {"lcoeFactor": 0.94},
    "nevada": {"lcoeFactor": 0.98},
    "new_york": {"lcoeFactor": 1.14},
}


def _normalize_preferences(raw: dict[str, Any] | None) -> dict[str, str]:
    prefs = {tech_id: TECH_PREFERENCE_IF_NECESSARY for tech_id in OPTIONAL_TECH_SPECS}
    if not isinstance(raw, dict):
        return prefs
    for tech_id in OPTIONAL_TECH_SPECS:
        value = raw.get(tech_id)
        if value in (TECH_PREFERENCE_MUST, TECH_PREFERENCE_SHOULD):
            prefs[tech_id] = value
    return prefs


def _is_elevated(preference: str | None) -> bool:
    return preference in (TECH_PREFERENCE_MUST, TECH_PREFERENCE_SHOULD)


def get_elevated_optional_tech_ids(preferences: dict[str, Any] | None) -> list[str]:
    prefs = _normalize_preferences(preferences)
    return [tech_id for tech_id in ELEVATED_OPTIONAL_TECH_IDS if _is_elevated(prefs.get(tech_id))]


def _elevated_share_seed(inputs: dict[str, Any]) -> int:
    key = "|".join(
        [
            str(inputs.get("loadMW")),
            str(inputs.get("stateId")),
            str(inputs.get("cityId")),
            str(inputs.get("reliabilityTarget")),
            str(inputs.get("minCfePercent", inputs.get("cfeTarget", 0))),
        ]
    )
    hash_value = 0
    for char in key:
        hash_value = (hash_value * 31 + ord(char)) & 0xFFFFFFFF
    return hash_value


def elevated_optional_capacity_share_percent(tech_id: str, seed: int = 0) -> float:
    mix = seed & 0xFFFFFFFF
    for char in tech_id:
        mix = (mix * 31 + ord(char)) & 0xFFFFFFFF
    unit = math.sin(mix) * 10000
    frac = unit - math.floor(unit)
    if frac < 0:
        frac += 1
    return ELEVATED_OPTIONAL_SHARE_MIN + frac * (ELEVATED_OPTIONAL_SHARE_MAX - ELEVATED_OPTIONAL_SHARE_MIN)


def _carbon_for_row(row: dict[str, Any], tech_specs: dict[str, dict[str, Any]]) -> float:
    tech_id = row.get("id", "")
    if tech_id in OPTIONAL_TECH_SPECS:
        return OPTIONAL_TECH_SPECS[tech_id]["carbon"]
    return tech_specs.get(tech_id, {}).get("carbon", 0)


def _build_optional_tech_row(tech_id: str, mw: int, profile: dict[str, Any]) -> dict[str, Any]:
    spec = OPTIONAL_TECH_SPECS[tech_id]
    cf = min(0.92, spec["defaultCf"])
    annual_gwh = mw * cf * 8760 / 1000
    lcoe = spec["defaultLcoe"] * profile["lcoeFactor"]
    return {
        "id": tech_id,
        "label": spec["label"],
        "fullLabel": spec["fullLabel"],
        "assetClass": spec["assetClass"],
        "installedMW": mw,
        "batteryMWh": None,
        "capacityFactor": cf,
        "utilization": None,
        "energyContributionGWh": annual_gwh,
        "lcoe": lcoe,
        "cfeClass": spec["cfeClass"],
    }


def apply_elevated_optional_technologies(
    result: dict[str, Any],
    inputs: dict[str, Any],
    *,
    tech_specs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not result.get("ok") or not isinstance(result.get("supplyMix"), list):
        return result

    elevated_ids = get_elevated_optional_tech_ids(inputs.get("technologyPreferences"))
    supply_mix = result["supplyMix"]
    missing_ids = [
        tech_id
        for tech_id in elevated_ids
        if not any(row.get("id") == tech_id and (row.get("installedMW") or 0) > 0 for row in supply_mix)
    ]
    if not missing_ids:
        return result

    state_id = inputs.get("stateId") or "texas"
    profile = STATES_PROFILE.get(state_id, STATES_PROFILE["texas"])
    seed = _elevated_share_seed(inputs)
    original_total = sum(row.get("installedMW") or 0 for row in supply_mix)
    if original_total <= 0:
        return result

    share_fracs = [elevated_optional_capacity_share_percent(tech_id, seed) / 100 for tech_id in missing_ids]
    share_sum = sum(share_fracs)
    if share_sum >= 1:
        return result

    scale = 1 - share_sum
    adjusted_rows = [
        {**row, "installedMW": max(0, round((row.get("installedMW") or 0) * scale))}
        for row in supply_mix
    ]
    adjusted_rows = [row for row in adjusted_rows if row.get("installedMW", 0) > 0]

    injected_rows = [
        _build_optional_tech_row(
            tech_id,
            max(1, round(original_total * share_frac)),
            profile,
        )
        for tech_id, share_frac in zip(missing_ids, share_fracs)
    ]

    rows = adjusted_rows + injected_rows
    total_energy = 0.0
    cfe_energy = 0.0
    weighted_lcoe = 0.0
    weighted_carbon = 0.0
    carbon_lookup = tech_specs or {}

    for row in rows:
        annual = row.get("energyContributionGWh") or 0
        total_energy += annual
        if row.get("cfeClass") == "Carbon-Free":
            cfe_energy += annual
        weighted_lcoe += (row.get("lcoe") or 0) * annual
        weighted_carbon += _carbon_for_row(row, carbon_lookup) * annual

    total_mw = sum(row.get("installedMW") or 0 for row in rows)
    for row in rows:
        row["energySharePercent"] = (row["energyContributionGWh"] / total_energy * 100) if total_energy else 0
        row["capacitySharePercent"] = (row["installedMW"] / total_mw * 100) if total_mw else 0
        row["percent"] = row["capacitySharePercent"]

    rows.sort(key=lambda row: row.get("installedMW") or 0, reverse=True)
    achieved_cfe = (cfe_energy / total_energy * 100) if total_energy else 0
    kpis = dict(result.get("kpis") or {})
    min_cfe = inputs.get("minCfePercent", inputs.get("cfeTarget", 0)) or 0

    return {
        **result,
        "supplyMix": rows,
        "totalInstalledMW": total_mw,
        "kpis": {
            **kpis,
            "installedCapacityMW": total_mw,
            "achievedCfe": max(kpis.get("achievedCfe", achieved_cfe), achieved_cfe)
            if min_cfe > 0
            else kpis.get("achievedCfe", 0),
            "lcoe": round(weighted_lcoe / total_energy) if total_energy else kpis.get("lcoe", 0),
            "carbonIntensity": round(weighted_carbon / total_energy) if total_energy else kpis.get("carbonIntensity", 0),
        },
        "capacityFactors": [
            {
                "id": row["id"],
                "label": row["label"],
                "capacityFactor": row.get("capacityFactor"),
                "utilization": row.get("utilization"),
            }
            for row in rows
        ],
        "annualGenerationGWh": round(total_energy, 1),
    }
