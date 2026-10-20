"""Martin Waco 1 GW DOE study — filter + minimum LCOE selection."""

from __future__ import annotations

from typing import Any

import pandas as pd

from configurator.conf_capex_lcoe import COL_ADJUSTMENT, apply_capex_fuel_lcoe
from configurator.conf_consolidated import TECH_SPECS
from configurator.dataVis.filters import apply_filters
from configurator.dataVis.loader import load_martin_dataframe
from configurator.dataVis.paths import (
    DEFAULT_WACO_LOAD_MW,
    MARTIN_STUDY_BADGER,
    MARTIN_STUDY_WACO,
    martin_study_from_state_id,
)


def resolve_martin_study_from_inputs(inputs: dict[str, Any]) -> str:
    raw = inputs.get("martinStudy") or inputs.get("martin_study")
    if raw == MARTIN_STUDY_BADGER:
        return MARTIN_STUDY_BADGER
    if raw == MARTIN_STUDY_WACO:
        return MARTIN_STUDY_WACO
    return martin_study_from_state_id(inputs.get("stateId"))

COL_CFE = "Carbon Free Energy (%)"
COL_LOAD_COMPLIANCE = "Annual Load Compliance (%)"
COL_LCOE = "Project LCOE ($/MWh)"
COL_PROJECT_CAPEX = "Project CAPEX ($ M)"
COL_CARBON = "Carbon Density (lb CO2/MWh)"
COL_TOTAL_AEP_GWH = "Total Yr1 AEP (GWh)"
COL_SOLAR_MW = "Solar AC Nameplate (MWac)"
COL_WIND_MW = "Wind Nameplate (MWac)"

# Display nameplates for unit-count thermal assets (Waco row stores counts, not MW).
MW_PER_7HA_UNIT = 384.0
MW_PER_LM2500_UNIT = 32.0

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


def _capacity_factor_gwh(capacity_mw: float, gwh: float) -> float | None:
    """Annual generation (GWh) / capacity (MW) / 8760 h.

    Capacity in MW times 8760 / 1000 is that same capacity in GWh, so the ratio
    stays dimensionless.
    """
    if capacity_mw <= 0 or gwh <= 0:
        return None
    denom = capacity_mw * 8760.0 / 1000.0
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


def _build_supply_mix_from_row(
    row: pd.Series,
    peak_load_mw: float,
) -> tuple[list[dict[str, Any]], float, float, float, float]:
    solar_mw = _num(row, "Solar AC Nameplate (MWac)")
    wind_mw = _num(row, "Wind Nameplate (MWac)")
    bess_mw = _num(row, "BESS power Nameplate (MW)")
    bess_mwh = _num(row, "BESS Performance Guarantee (MWh)")
    if bess_mwh <= 0:
        bess_mwh = _num(row, "BESS initially installed Capacity (MWh)")

    ha_units = _num(row, "7HA Unit #")
    if ha_units <= 0:
        ha_units = _num(row, "7HA.02 Unit #")
    lm_units = _num(row, "LM2500 Unit #")
    ha_mw = ha_units * MW_PER_7HA_UNIT
    lm_mw = lm_units * MW_PER_LM2500_UNIT

    solar_gwh = _kwh_to_gwh(_num(row, "Year 1 Solar AEP (kWh)"))
    wind_gwh = _kwh_to_gwh(_num(row, "Year 1 Wind AEP (kWh)"))
    bess_gwh = _kwh_to_gwh(_num(row, "Year 1 BESS AEP (kWh)"))
    separate_ha_kwh = _num(row, "Year 1 7HA AEP (kWh)")
    separate_lm_kwh = _num(row, "Year 1 LM2500 AEP (kWh)")
    combined_kwh = _num(row, "Year 1 7HA+LM2500 AEP (kWh)")
    if combined_kwh <= 0 and (separate_ha_kwh > 0 or separate_lm_kwh > 0):
        ha_gwh = _kwh_to_gwh(separate_ha_kwh)
        lm_gwh = _kwh_to_gwh(separate_lm_kwh)
        thermal_gwh = ha_gwh + lm_gwh
    else:
        thermal_kwh = combined_kwh if combined_kwh > 0 else separate_lm_kwh
        thermal_gwh = _kwh_to_gwh(thermal_kwh) if thermal_kwh > 0 else 0.0
        thermal_mw = ha_mw + lm_mw
        if thermal_mw > 0 and thermal_gwh > 0:
            ha_gwh = thermal_gwh * (ha_mw / thermal_mw)
            lm_gwh = thermal_gwh * (lm_mw / thermal_mw)
        else:
            ha_gwh = 0.0
            lm_gwh = 0.0
    thermal_cf = _capacity_factor_gwh(peak_load_mw, thermal_gwh)

    portfolio_lcoe = _num(row, COL_LCOE)
    candidates: list[dict[str, Any]] = []

    def add(
        tech_id: str,
        mw: float,
        gwh: float,
        lcoe_col: str,
        *,
        utilization: float | None = None,
        capacity_factor: float | None = None,
        derive_capacity_factor: bool = True,
        **kwargs: Any,
    ) -> None:
        lcoe_val = _num(row, lcoe_col, portfolio_lcoe) if lcoe_col else portfolio_lcoe
        if derive_capacity_factor and utilization is None and capacity_factor is None:
            cf = _capacity_factor_gwh(mw, gwh)
        else:
            cf = capacity_factor
        built = _mix_row(
            tech_id=tech_id,
            installed_mw=mw,
            energy_gwh=gwh,
            lcoe=lcoe_val if lcoe_val > 0 else None,
            capacity_factor=cf,
            utilization=utilization,
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
        capacity_factor=_capacity_factor_gwh(bess_mw, bess_gwh),
        derive_capacity_factor=False,
    )
    add(
        "hd7ha02",
        ha_mw,
        ha_gwh,
        "7HA LCOE ($/MWh)",
        unit_count=ha_units if ha_units > 0 else None,
        capacity_factor=None,
        derive_capacity_factor=False,
    )
    add(
        "lm2500g4",
        lm_mw,
        lm_gwh,
        "LM2500 LCOE ($/MWh)",
        unit_count=lm_units if lm_units > 0 else None,
        capacity_factor=None,
        derive_capacity_factor=False,
    )
    if thermal_cf is not None and (ha_mw > 0 or lm_mw > 0):
        candidates.append(
            {
                "id": "thermal",
                "label": "Thermal CF",
                "fullLabel": "Thermal CF",
                "assetClass": "Thermal",
                "installedMW": 0,
                "batteryMWh": None,
                "capacityFactor": thermal_cf,
                "utilization": None,
                "energyContributionGWh": 0,
                "lcoe": None,
                "cfeClass": "",
                "capacityFactorOnly": True,
            }
        )

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


def generate_martin_configurator_result(
    inputs: dict[str, Any],
    datavis_filters: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
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

    martin_study = resolve_martin_study_from_inputs(inputs)

    try:
        df = load_martin_dataframe(load_mw=waco_tier, martin_study=martin_study)
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "error": "Martin study dataset could not be loaded.",
            "details": [str(exc)],
        }

    df, capex_info = apply_capex_fuel_lcoe(
        df,
        inputs.get("technologyCapex"),
        load_mw,
        martin_study=martin_study,
    )

    if datavis_filters:
        filtered = apply_filters(df, datavis_filters)
    else:
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

    # Same LCOE can describe more than one plant. Keep the cheapest, then the
    # smaller plant, so the architecture and the parallel chart pick one row.
    sort_cols = [COL_LCOE]
    for tie_col in (
        "7HA Unit #",
        "LM2500 Unit #",
        COL_SOLAR_MW,
        COL_WIND_MW,
        "BESS power Nameplate (MW)",
        "dataVis_row_id",
    ):
        if tie_col in filtered.columns and tie_col not in sort_cols:
            sort_cols.append(tie_col)
    filtered = filtered.sort_values(
        sort_cols,
        ascending=True,
        na_position="last",
        kind="mergesort",
    )
    winner = filtered.iloc[0]
    row_index = int(winner.name) if winner.name is not None else 0
    if "dataVis_row_id" in winner.index and pd.notna(winner["dataVis_row_id"]):
        martin_data_vis_row_id = int(winner["dataVis_row_id"])
    else:
        martin_data_vis_row_id = row_index

    rows, total_energy, _cfe_energy, portfolio_lcoe, carbon = _build_supply_mix_from_row(winner, load_mw)
    achieved_cfe_fraction = _num(winner, COL_CFE)
    achieved_cfe_percent = achieved_cfe_fraction * 100.0
    achieved_rel = _num(winner, COL_LOAD_COMPLIANCE)
    total_installed = sum(r["installedMW"] for r in rows)
    project_capex_usd_m = _num(winner, COL_PROJECT_CAPEX)
    project_capex_per_kw = (
        (project_capex_usd_m * 1_000_000.0) / (load_mw * 1000.0)
        if load_mw > 0 and project_capex_usd_m > 0
        else None
    )

    return {
        "ok": True,
        "synthetic": False,
        "source": "martin-waco-doe",
        "martinRowIndex": row_index,
        "martinDataVisRowId": martin_data_vis_row_id,
        "inputs": {**inputs, "minCfePercent": min_cfe_percent, "reliabilityTarget": reliability_target, "loadMW": load_mw},
        "location": (
            {
                "state": "Wisconsin",
                "city": "Badger Hollow Creek",
                "study": f"Martin Badger Hollow Creek {int(load_mw)} MW DOE",
            }
            if martin_study == MARTIN_STUDY_BADGER
            else {
                "state": "Texas",
                "city": "Waco",
                "study": "Martin Waco DOE",
            }
        ),
        "gridConnectionMode": inputs.get("gridConnectionMode") or "grid-connected",
        "summary": (
            f"Least-cost Martin Waco case with carbon-free energy "
            f"{min(min_cfe_percent, max_cfe_percent):.0f}–{max(min_cfe_percent, max_cfe_percent):.0f}% "
            f"and ≥{reliability_target:.2f}% Year 1 load compliance."
        ),
        "totalInstalledMW": total_installed,
        "supplyMix": [r for r in rows if not r.get("capacityFactorOnly")],
        "kpis": {
            "installedCapacityMW": total_installed,
            "achievedReliability": achieved_rel,
            "reliabilityTarget": reliability_target,
            "achievedCfe": achieved_cfe_percent,
            "minCfePercent": min_cfe_percent,
            "maxCfePercent": max_cfe_percent,
            "lcoe": int(round(portfolio_lcoe)),
            "lcoeCapexApplied": bool(capex_info.get("applied")),
            "lcoeCapexPending": capex_info.get("reason") == "missing-columns",
            "lcoeCapexLocked": capex_info.get("reason") == "wisconsin-1000",
            "capexFuelAdjustment": (
                round(_num(winner, COL_ADJUSTMENT, 1.0), 4)
                if capex_info.get("applied")
                else None
            ),
            "projectCapexUsdM": round(project_capex_usd_m, 1),
            "projectCapexPerKw": (
                round(project_capex_per_kw) if project_capex_per_kw is not None else None
            ),
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
            if r.get("capacityFactorOnly") or r.get("capacityFactor") is not None or r.get("utilization") is not None
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
