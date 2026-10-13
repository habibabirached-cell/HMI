"""Martin Waco 1 GW DOE study — filter + minimum LCOE selection."""

from __future__ import annotations

from typing import Any

import pandas as pd

from configurator.conf_consolidated import TECH_SPECS
from configurator.dataVis.loader import load_waco_dataframe

COL_CFE = "Carbon Free Energy (%)"
COL_LOAD_COMPLIANCE = "Year 1 Load Compliance (%)"
COL_LCOE = "Project LCOE ($/MWh)"
COL_CARBON = "Carbon Density (lb CO2/MWh)"
COL_TOTAL_AEP_GWH = "Total Yr1 AEP (GWh)"

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
) -> dict[str, Any] | None:
    if installed_mw <= 0 and (battery_mwh or 0) <= 0:
        return None
    spec = TECH_SPECS[tech_id]
    return {
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
    add("hd7ha02", ha_mw, ha_gwh, "7HA LCOE ($/MWh)")
    add("lm2500g4", lm_mw, lm_gwh, "LM2500 LCOE ($/MWh)")

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


def _filter_waco_dataframe(df: pd.DataFrame, min_cfe_fraction: float, reliability_target: float) -> pd.DataFrame:
    cfe = df[COL_CFE]
    load = df[COL_LOAD_COMPLIANCE]
    lcoe = df[COL_LCOE]
    mask = (
        cfe.notna()
        & load.notna()
        & lcoe.notna()
        & (cfe >= min_cfe_fraction)
        & (load >= reliability_target)
    )
    return df.loc[mask].copy()


def generate_martin_configurator_result(inputs: dict[str, Any]) -> dict[str, Any]:
    min_cfe_percent = float(inputs.get("minCfePercent") if inputs.get("minCfePercent") is not None else inputs.get("cfeTarget") or 0)
    reliability_target = float(inputs.get("reliabilityTarget") or 99.99)
    load_mw = float(inputs.get("loadMW") or 1350)

    min_cfe_fraction = min(1.0, max(0.0, min_cfe_percent / 100.0))

    try:
        df = load_waco_dataframe()
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "Martin Waco dataset could not be loaded.",
            "details": [str(exc)],
        }

    filtered = _filter_waco_dataframe(df, min_cfe_fraction, reliability_target)
    if filtered.empty:
        return {
            "ok": False,
            "error": "No Martin study cases meet your carbon-free and availability targets.",
            "details": [
                f"Minimum carbon-free energy: {min_cfe_percent:.0f}% (dataset uses 0–1 scale).",
                f"Minimum Year 1 load compliance: {reliability_target:.4f}%.",
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

    return {
        "ok": True,
        "synthetic": False,
        "source": "martin-waco-doe",
        "martinRowIndex": row_index,
        "inputs": {**inputs, "minCfePercent": min_cfe_percent, "reliabilityTarget": reliability_target, "loadMW": load_mw},
        "location": {"state": "Texas", "study": "Martin Waco 1 GW DOE"},
        "gridConnectionMode": inputs.get("gridConnectionMode") or "grid-connected",
        "summary": (
            f"Least-cost Martin Waco case meeting ≥{min_cfe_percent:.0f}% carbon-free energy "
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
            "lcoe": int(round(portfolio_lcoe)),
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
            "cfeMet": achieved_cfe_fraction >= min_cfe_fraction,
            "loadMet": True,
            "notes": [f"Selected from {len(filtered)} qualifying Waco cases (minimum project LCOE)."],
        },
    }
