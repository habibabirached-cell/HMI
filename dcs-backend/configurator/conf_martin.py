"""Martin Waco 1 GW DOE study — filter + minimum LCOE selection."""

from __future__ import annotations

from typing import Any

import pandas as pd

from configurator.conf_consolidated import TECH_SPECS
from configurator.dataVis.loader import load_waco_dataframe
from configurator.dataVis.paths import DEFAULT_WACO_LOAD_MW

COL_CFE = "Carbon Free Energy (%)"
COL_LOAD_COMPLIANCE = "Year 1 Load Compliance (%)"
COL_LCOE = "Project LCOE ($/MWh)"
COL_PROJECT_CAPEX = "Project CAPEX ($ M)"
COL_CARBON = "Carbon Density (lb CO2/MWh)"
COL_TOTAL_AEP_GWH = "Total Yr1 AEP (GWh)"
COL_SOLAR_MW = "Solar AC Nameplate (MWac)"
COL_WIND_MW = "Wind Nameplate (MWac)"

# Display nameplates for unit-count thermal assets (Waco row stores counts, not MW).
MW_PER_7HA_UNIT = 430.0
MW_PER_LM2500_UNIT = 34.5

_KWH_TO_GWH = 1.0 / 1_000_000.0


def _num(row: pd.Series, key: str, default: float = 0.0) -> float:
    val = row.get(key)
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _kwh_to_gwh(kwh: float) -> float:
    return kwh * _KWH_TO_GWH


def _capacity_factor_gwh(mw: float, gwh: float) -> float | None:
    if mw <= 0 or gwh <= 0:
        return None
    denom = mw * 8760.0 / 1000.0
    if denom <= 0:
        return None
    return gwh / denom


def _mix_row(
    *,
    tech_id: str,
    installed_mw: float,
    energy_gwh: float,
    lcoe: float | None,
    battery_mwh: float | None = None,
    capacity_factor: float | None = None,
    utilization: float | None = None,
    unit_count: float | None = None,
) -> dict[str, Any] | None:
    if installed_mw <= 0 and (battery_mwh or 0) <= 0:
        return None
    spec = TECH_SPECS[tech_id]
    row: dict[str, Any] = {
        "id": tech_id,
        "label": spec["label"],
        "fullLabel": spec["fullLabel"],
        "assetClass": spec["assetClass"],
        "installedMW": round(installed_mw),
        "batteryMWh": round(battery_mwh) if battery_mwh else None,
        "capacityFactor": capacity_factor,
        "utilization": utilization,
        "energyContributionGWh": energy_gwh,
        "lcoe": lcoe if lcoe is not None else spec["defaultLcoe"],
        "cfeClass": spec["cfeClass"],
    }
    if unit_count is not None and unit_count > 0:
        row["unitCount"] = int(round(unit_count))
    return row


def _build_supply_mix_from_row(row: pd.Series) -> tuple[list[dict[str, Any]], float, float, float, float]:
    solar_mw = _num(row, "Solar AC Nameplate (MWac)")
    wind_mw = _num(row, "Wind Nameplate (MWac)")
    bess_mw = _num(row, "BESS power Nameplate (MW)")
    bess_mwh = _num(row, "BESS Performance Guarantee (MWh)")
    if bess_mwh <= 0:
        bess_mwh = _num(row, "BESS initially installed Capacity (MWh)")

    ha_units = _num(row, "7HA Unit #")
    lm_units = _num(row, "LM2500 Unit #")
    ha_mw = ha_units * MW_PER_7HA_UNIT
    lm_mw = lm_units * MW_PER_LM2500_UNIT

    solar_gwh = _kwh_to_gwh(_num(row, "Year 1 Solar AEP (kWh)"))
    wind_gwh = _kwh_to_gwh(_num(row, "Year 1 Wind AEP (kWh)"))
    bess_gwh = _kwh_to_gwh(_num(row, "Year 1 BESS AEP (kWh)"))
    thermal_kwh = _num(row, "Year 1 7HA+LM2500 AEP (kWh)")
    if thermal_kwh <= 0:
        thermal_kwh = _num(row, "Year 1 LM2500 AEP (kWh)")
    thermal_mw = ha_mw + lm_mw
    if thermal_mw > 0 and thermal_kwh > 0:
        ha_gwh = _kwh_to_gwh(thermal_kwh * (ha_mw / thermal_mw))
        lm_gwh = _kwh_to_gwh(thermal_kwh * (lm_mw / thermal_mw))
    else:
        ha_gwh = 0.0
        lm_gwh = 0.0

    portfolio_lcoe = _num(row, COL_LCOE)
    candidates: list[dict[str, Any]] = []

    def add(tech_id: str, mw: float, gwh: float, lcoe_col: str, **kwargs: Any) -> None:
        lcoe_val = _num(row, lcoe_col, portfolio_lcoe) if lcoe_col else portfolio_lcoe
        cf = _capacity_factor_gwh(mw, gwh)
        built = _mix_row(
            tech_id=tech_id,
            installed_mw=mw,
            energy_gwh=gwh,
            lcoe=lcoe_val if lcoe_val > 0 else None,
            capacity_factor=cf,
            **kwargs,
        )
        if built:
            candidates.append(built)

    add("solar", solar_mw, solar_gwh, "Solar LCOE ($/MWh)")
    add("wind", wind_mw, wind_gwh, "Wind LCOE ($/MWh)")
    add(
        "battery",
        bess_mw,
        bess_gwh,
        "BESS LCOE ($/MWh)",
        battery_mwh=bess_mwh if bess_mwh > 0 else None,
        utilization=None,
    )
    add("hd7ha02", ha_mw, ha_gwh, "7HA LCOE ($/MWh)", unit_count=ha_units if ha_units > 0 else None)
    add("lm2500g4", lm_mw, lm_gwh, "LM2500 LCOE ($/MWh)", unit_count=lm_units if lm_units > 0 else None)

    total_energy = sum(r["energyContributionGWh"] for r in candidates)
    if total_energy <= 0:
        total_energy = _num(row, COL_TOTAL_AEP_GWH)
        if total_energy > 0 and candidates:
            share = total_energy / len(candidates)
            for r in candidates:
                r["energyContributionGWh"] = share

    cfe_fraction = _num(row, COL_CFE)
    cfe_energy = total_energy * min(1.0, max(0.0, cfe_fraction))

    total_mw = sum(r["installedMW"] for r in candidates)
    for r in candidates:
        r["energySharePercent"] = (r["energyContributionGWh"] / total_energy * 100) if total_energy else 0
        r["capacitySharePercent"] = (r["installedMW"] / total_mw * 100) if total_mw else 0
        r["percent"] = r["capacitySharePercent"]

    candidates.sort(key=lambda r: r["installedMW"], reverse=True)
    carbon = _num(row, COL_CARBON, 0)
    return candidates, total_energy, cfe_energy, portfolio_lcoe, carbon


def _filter_waco_dataframe(
    df: pd.DataFrame,
    min_cfe_fraction: float,
    max_cfe_fraction: float,
    reliability_target: float,
    min_solar_mw: float,
    max_solar_mw: float,
    min_wind_mw: float,
    max_wind_mw: float,
) -> pd.DataFrame:
    cfe = df[COL_CFE]
    load = df[COL_LOAD_COMPLIANCE]
    lcoe = df[COL_LCOE]
    solar = df[COL_SOLAR_MW] if COL_SOLAR_MW in df.columns else None
    wind = df[COL_WIND_MW] if COL_WIND_MW in df.columns else None
    lo = min(min_cfe_fraction, max_cfe_fraction)
    hi = max(min_cfe_fraction, max_cfe_fraction)
    solar_lo = min(min_solar_mw, max_solar_mw)
    solar_hi = max(min_solar_mw, max_solar_mw)
    wind_lo = min(min_wind_mw, max_wind_mw)
    wind_hi = max(min_wind_mw, max_wind_mw)
    mask = (
        cfe.notna()
        & load.notna()
        & lcoe.notna()
        & (cfe >= lo)
        & (cfe <= hi)
        & (load >= reliability_target)
    )
    if solar is not None:
        mask &= solar.notna() & (solar >= solar_lo) & (solar <= solar_hi)
    if wind is not None:
        mask &= wind.notna() & (wind >= wind_lo) & (wind <= wind_hi)
    return df.loc[mask].copy()


def generate_martin_configurator_result(inputs: dict[str, Any]) -> dict[str, Any]:
    min_cfe_percent = float(inputs.get("minCfePercent") if inputs.get("minCfePercent") is not None else inputs.get("cfeTarget") or 0)
    max_cfe_percent = float(inputs.get("maxCfePercent") if inputs.get("maxCfePercent") is not None else 100)
    reliability_target = float(inputs.get("reliabilityTarget") or 99.99)
    raw_load = inputs.get("loadMW")
    try:
        rounded = int(round(float(raw_load))) if raw_load is not None and raw_load != "" else None
    except (TypeError, ValueError):
        rounded = None
    if rounded in (200, 1000):
        waco_tier = rounded
        load_mw = float(rounded)
    else:
        waco_tier = DEFAULT_WACO_LOAD_MW
        load_mw = float(raw_load) if raw_load not in (None, "") else float(DEFAULT_WACO_LOAD_MW)
    min_solar_mw = float(inputs.get("minSolarMW") if inputs.get("minSolarMW") is not None else 0)
    max_solar_mw = float(inputs.get("maxSolarMW") if inputs.get("maxSolarMW") is not None else 4000)
    min_wind_mw = float(inputs.get("minWindMW") if inputs.get("minWindMW") is not None else 0)
    max_wind_mw = float(inputs.get("maxWindMW") if inputs.get("maxWindMW") is not None else 3000)

    min_cfe_fraction = min(1.0, max(0.0, min_cfe_percent / 100.0))
    max_cfe_fraction = min(1.0, max(0.0, max_cfe_percent / 100.0))

    try:
        df = load_waco_dataframe(waco_tier)
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "Martin Waco dataset could not be loaded.",
            "details": [str(exc)],
        }

    filtered = _filter_waco_dataframe(
        df,
        min_cfe_fraction,
        max_cfe_fraction,
        reliability_target,
        min_solar_mw,
        max_solar_mw,
        min_wind_mw,
        max_wind_mw,
    )
    if filtered.empty:
        return {
            "ok": False,
            "error": "No Martin study cases meet your filters.",
            "details": [
                f"Carbon-free energy band: {min(min_cfe_percent, max_cfe_percent):.0f}%–{max(min_cfe_percent, max_cfe_percent):.0f}% (dataset uses 0–1 scale).",
                f"Minimum Year 1 load compliance: {reliability_target:.4f}%.",
                f"Solar nameplate band: {min(min_solar_mw, max_solar_mw):.0f}–{max(min_solar_mw, max_solar_mw):.0f} MW AC.",
                f"Wind nameplate band: {min(min_wind_mw, max_wind_mw):.0f}–{max(min_wind_mw, max_wind_mw):.0f} MW.",
            ],
        }

    filtered = filtered.sort_values(COL_LCOE, ascending=True, na_position="last")
    winner = filtered.iloc[0]
    row_index = int(winner.name) if winner.name is not None else 0

    rows, total_energy, _cfe_energy, portfolio_lcoe, carbon = _build_supply_mix_from_row(winner)
    achieved_cfe_fraction = _num(winner, COL_CFE)
    achieved_cfe_percent = achieved_cfe_fraction * 100.0
    achieved_rel = _num(winner, COL_LOAD_COMPLIANCE)
    total_installed = sum(r["installedMW"] for r in rows)
    project_capex_usd_m = _num(winner, COL_PROJECT_CAPEX)

    return {
        "ok": True,
        "synthetic": False,
        "source": "martin-waco-doe",
        "martinRowIndex": row_index,
        "inputs": {**inputs, "minCfePercent": min_cfe_percent, "reliabilityTarget": reliability_target, "loadMW": load_mw},
        "location": {"state": "Texas", "study": "Martin Waco 1 GW DOE"},
        "gridConnectionMode": inputs.get("gridConnectionMode") or "grid-connected",
        "summary": (
            f"Least-cost Martin Waco case with carbon-free energy "
            f"{min(min_cfe_percent, max_cfe_percent):.0f}–{max(min_cfe_percent, max_cfe_percent):.0f}% "
            f"and ≥{reliability_target:.2f}% Year 1 load compliance."
        ),
        "totalInstalledMW": total_installed,
        "supplyMix": rows,
        "kpis": {
            "installedCapacityMW": total_installed,
            "achievedReliability": achieved_rel,
            "reliabilityTarget": reliability_target,
            "achievedCfe": achieved_cfe_percent,
            "minCfePercent": min_cfe_percent,
            "maxCfePercent": max_cfe_percent,
            "lcoe": int(round(portfolio_lcoe)),
            "projectCapexUsdM": round(project_capex_usd_m, 1),
            "carbonIntensity": int(round(carbon)) if carbon > 0 else None,
        },
        "capacityFactors": [
            {
                "id": r["id"],
                "label": r["label"],
                "capacityFactor": r["capacityFactor"],
                "utilization": r["utilization"],
            }
            for r in rows
        ],
        "curtailment": {
            "solarCurtailmentPercent": None,
            "windCurtailmentPercent": None,
            "totalRenewableCurtailmentPercent": None,
            "curtailedGWh": 0,
            "renewableAvailableGWh": 0,
            "renewableUsedGWh": 0,
        },
        "annualGenerationGWh": round(total_energy, 1),
        "targets": {
            "relMet": achieved_rel >= reliability_target,
            "cfeMet": min(min_cfe_fraction, max_cfe_fraction)
            <= achieved_cfe_fraction
            <= max(min_cfe_fraction, max_cfe_fraction),
            "loadMet": True,
            "notes": [f"Selected from {len(filtered)} qualifying Waco cases (minimum project LCOE)."],
        },
    }
