"""Scale Martin project LCOE when the user changes installed CAPEX or gas price.

200 MW (Texas and Wisconsin) uses Charu's 200 MW factors: solar / 1,600,
wind / 2,000, LM2500 / 3,000, battery / 238, LM2500 gas / 3.50. Heavy-duty
CAPEX and heavy-duty gas are not used.

Texas 1 GW uses the later factors: solar / 1,200, wind / 1,200, 7HA / 2,000,
LM2500 / 2,500, battery / 238, gas / 3.50. 7HA and LM2500 fuel both scale.
Their LCOEs are combined into one thermal LCOE before the blend, using the
7HA unit count (0, 3, or a capacity-weighted mix).

Wisconsin 1 GW uses the same divisors as 200 MW, and it scales the 7HA as
well as the LM2500. Each turbine keeps its own year-1 energy in the blend.
The screen has a gas price on each turbine: 7HA gas scales 7HA fuel, and
LM2500 gas scales LM2500 fuel. When those two prices match, that is Charu's
single fuel factor.

The numbers on the screen start at the same prices for every case. Those
starting numbers are the 200 MW denominators, not the Texas 1 GW denominators.
"""

from __future__ import annotations

import math
from contextvars import ContextVar
from typing import Any

import numpy as np
import pandas as pd

# Study prices the default LCOE columns were computed at.
SOLAR_CAPEX_DEFAULT = 1600.0  # $/kW
WIND_CAPEX_DEFAULT = 2000.0  # $/kW
HDGT_CAPEX_DEFAULT = 2500.0  # $/kW — not used on 200 MW
AERO_CAPEX_DEFAULT = 3000.0  # $/kW
BESS_CAPEX_DEFAULT = 238.0  # $/kWh
FUEL_PRICE_DEFAULT = 3.5  # $/MMBtu

# Denominators for the Texas 1 GW case. Screen starting prices stay at the
# 200 MW values above; these are only the divisors in Charu's 1 GW Texas factors.
TX_GW_SOLAR_CAPEX_DEFAULT = 1200.0  # $/kW
TX_GW_WIND_CAPEX_DEFAULT = 1200.0  # $/kW
TX_GW_HDGT_CAPEX_DEFAULT = 2000.0  # $/kW
TX_GW_AERO_CAPEX_DEFAULT = 2500.0  # $/kW

MARTIN_STUDY_WACO = "waco"
MARTIN_STUDY_BADGER = "badger_hollow_creek"

_HA_MW = 384.0
_LM_MW = 32.0
_HOURS_PER_YEAR = 8760.0

# The Texas 1 GW extract stores one LCOE per technology. These recover the
# CAPEX, fuel, and O&M pieces from that total. Capital and fixed O&M scale as
# 1/capacity-factor; fuel is nearly constant $/MWh. Fitted on the Wisconsin
# 1 GW workbook, which has the split, and checked against the Texas totals.
_SOLAR_CAPEX_SHARE = 0.9498
_WIND_CAPEX_SHARE = 0.9017
_BESS_CAPEX_SHARE = 0.8093
_HA_CAPEX_AT_FULL_CF = 28.944231253716453
_HA_FUEL_LCOE = 41.6273148939145
_HA_OM_AT_FULL_CF = 2.8428745327543288
_LM_CAPEX_AT_FULL_CF = 34.634908962825804
_LM_FUEL_LCOE = 46.279724757699796
_LM_OM_AT_FULL_CF = 2.0493549909986113

COL_PROJECT_LCOE = "Project LCOE ($/MWh)"
COL_PROJECT_LCOE_DEFAULT = "Project LCOE ($/MWh) at default CAPEX/Fuel values"
COL_BLENDED_DEFAULT = "Blended LCOE ($/MWh) at default CAPEX/Fuel Values"
COL_BLENDED_USER = "Blended LCOE ($/MWh) w/ CAPEX/Fuel inputs"
COL_ADJUSTMENT = "CAPEX/Fuel adjustment on LCOE"
COL_PROJECT_USER = "Project LOCE ($/MWh) w/ user CAPEX/Fuel inputs"

_REQUIRED = (
    "Solar CAPEX LCOE at default value",
    "Solar OM LCOE",
    "Wind CAPEX LCOE w/ default value",
    "Wind OM LCOE",
    "BESS CAPEX LCOE",
    "BESS OM LCOE",
    "LM2500 CAPEX LCOE at default value",
    "LM2500 Fuel LCOE at default value",
    "LM2500 OM LCOE",
    "Year 1 Solar AEP (kWh)",
    "Year 1 Wind AEP (kWh)",
    "Year 1 BESS AEP (kWh)",
    "Year 1 LM2500 AEP (kWh)",
    "Total Yr1 AEP (GWh)",
    COL_PROJECT_LCOE,
)


def _positive(value: object, default: float | None = None) -> float | None:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number) or number <= 0:
        return default
    return number


def wheel_unit_capex(stored: object, _load_mw: object = None) -> float | None:
    """Installed CAPEX on the wheel ($/kW or $/kWh), same number on 200 MW and 1 GW."""
    return _positive(stored)


def _factor(selected: float | None, study_default: float) -> float:
    if selected is None or study_default <= 0:
        return 1.0
    return selected / study_default


def capex_fuel_factors(
    technology_capex: dict[str, Any] | None,
    load_mw: object,
    *,
    basis: str = "200",
) -> dict[str, float]:
    """Scaling factors from the Ideum arrows. Missing prices stay at that study's divisor."""
    capex = technology_capex if isinstance(technology_capex, dict) else {}
    solar = wheel_unit_capex((capex.get("solar") or {}).get("capexPerKwAc"), load_mw)
    wind = wheel_unit_capex((capex.get("wind") or {}).get("capexPerKw"), load_mw)
    hdgt = wheel_unit_capex((capex.get("heavyDutyGT") or {}).get("capexPerKw"), load_mw)
    aero = wheel_unit_capex((capex.get("aeroderivativeGT") or {}).get("capexPerKw"), load_mw)
    bess = wheel_unit_capex((capex.get("battery") or {}).get("capexPerKwh"), load_mw)
    fuel = _positive((capex.get("aeroderivativeGT") or {}).get("gasPricePerMmbtu"), FUEL_PRICE_DEFAULT)
    hd_fuel = _positive((capex.get("heavyDutyGT") or {}).get("gasPricePerMmbtu"), FUEL_PRICE_DEFAULT)
    if basis == "tx1000":
        solar_den, wind_den, hd_den, aero_den = (
            TX_GW_SOLAR_CAPEX_DEFAULT,
            TX_GW_WIND_CAPEX_DEFAULT,
            TX_GW_HDGT_CAPEX_DEFAULT,
            TX_GW_AERO_CAPEX_DEFAULT,
        )
    else:
        solar_den, wind_den, hd_den, aero_den = (
            SOLAR_CAPEX_DEFAULT,
            WIND_CAPEX_DEFAULT,
            HDGT_CAPEX_DEFAULT,
            AERO_CAPEX_DEFAULT,
        )
    return {
        "solar": _factor(solar, solar_den),
        "wind": _factor(wind, wind_den),
        "hdgt": _factor(hdgt, hd_den),
        "aero": _factor(aero, aero_den),
        "bess": _factor(bess, BESS_CAPEX_DEFAULT),
        "fuel": _factor(fuel, FUEL_PRICE_DEFAULT),
        "hdFuel": _factor(hd_fuel, FUEL_PRICE_DEFAULT),
    }


def _col(df: pd.DataFrame, name: str) -> pd.Series:
    if name not in df.columns:
        return pd.Series(0.0, index=df.index, dtype="float64")
    return pd.to_numeric(df[name], errors="coerce").fillna(0.0)


def _blend(
    solar_lcoe: pd.Series,
    wind_lcoe: pd.Series,
    bess_lcoe: pd.Series,
    lm_lcoe: pd.Series,
    solar_aep: pd.Series,
    wind_aep: pd.Series,
    bess_aep: pd.Series,
    lm_aep: pd.Series,
    total_gwh: pd.Series,
) -> pd.Series:
    numerator = (
        solar_lcoe * solar_aep
        + wind_lcoe * wind_aep
        + bess_lcoe * bess_aep
        + lm_lcoe * lm_aep
    )
    denominator = total_gwh * 1_000_000.0
    blended = numerator / denominator.where(denominator > 0)
    return blended


_TX_GW_REQUIRED = (
    "Solar CAPEX LCOE at default value",
    "Solar OM LCOE",
    "Wind CAPEX LCOE w/ default value",
    "Wind OM LCOE",
    "BESS CAPEX LCOE",
    "BESS OM LCOE",
    "7HA CAPEX LCOE at default value",
    "7HA Fuel LCOE at default value",
    "7HA OM LCOE",
    "LM2500 CAPEX LCOE at default value",
    "LM2500 Fuel LCOE at default value",
    "LM2500 OM LCOE",
    "Year 1 Solar AEP (kWh)",
    "Year 1 Wind AEP (kWh)",
    "Year 1 BESS AEP (kWh)",
    "Total Yr1 AEP (GWh)",
    COL_PROJECT_LCOE,
)
_WI_GW_REQUIRED = _TX_GW_REQUIRED + ("Year 1 7HA AEP (kWh)", "Year 1 LM2500 AEP (kWh)")
_HA_UNIT_COLUMNS = ("7HA Unit #", "7HA.02 Unit #")
_GAS_AEP_COLUMN = "Year 1 7HA+LM2500 AEP (kWh)"


def _load_tier(load_mw: object) -> int | None:
    try:
        tier = int(round(float(load_mw)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return tier if tier in (200, 1000) else None


def _normalize_study(martin_study: object) -> str | None:
    if martin_study in (MARTIN_STUDY_WACO, MARTIN_STUDY_BADGER):
        return str(martin_study)
    return None


def _thermal_lcoe(
    ha_lcoe: pd.Series,
    lm_lcoe: pd.Series,
    ha_units: pd.Series,
    lm_units: pd.Series,
) -> pd.Series:
    """Charu's calculated thermal LCOE for the Texas 1 GW case."""
    ha_n = ha_units.to_numpy(dtype="float64")
    lm_n = lm_units.to_numpy(dtype="float64")
    ha = ha_lcoe.to_numpy(dtype="float64")
    lm = lm_lcoe.to_numpy(dtype="float64")
    zero = np.isclose(ha_n, 0.0, atol=1e-6)
    three = np.isclose(ha_n, 3.0, atol=1e-6)
    denominator = ha_n * _HA_MW + lm_n * _LM_MW
    numerator = ha * ha_n * _HA_MW + lm * lm_n * _LM_MW
    thermal = np.divide(numerator, denominator, out=np.zeros_like(numerator), where=denominator > 0)
    thermal = np.where(three, ha, thermal)
    thermal = np.where(zero, 0.0, thermal)
    return pd.Series(thermal, index=ha_lcoe.index, dtype="float64")


def _gas_aep(df: pd.DataFrame) -> pd.Series | None:
    if _GAS_AEP_COLUMN in df.columns:
        return _col(df, _GAS_AEP_COLUMN)
    if "Year 1 7HA AEP (kWh)" in df.columns and "Year 1 LM2500 AEP (kWh)" in df.columns:
        return _col(df, "Year 1 7HA AEP (kWh)") + _col(df, "Year 1 LM2500 AEP (kWh)")
    return None


def _ha_units(df: pd.DataFrame) -> pd.Series | None:
    for name in _HA_UNIT_COLUMNS:
        if name in df.columns:
            return _col(df, name)
    return None


def _capacity_factor(aep_kwh: pd.Series, units: pd.Series, unit_mw: float) -> pd.Series:
    denominator = units * unit_mw * _HOURS_PER_YEAR * 1000.0
    cf = aep_kwh / denominator.where(denominator > 0)
    return cf.clip(lower=0.005, upper=1.0).fillna(0.005)


def _scale_to_total(total: pd.Series, *parts: pd.Series) -> tuple[pd.Series, ...]:
    raw = sum(parts)
    scale = (total / raw).where(raw > 0, 0.0)
    return tuple(part * scale for part in parts)


def _turbine_pieces(
    total: pd.Series,
    cf: pd.Series,
    capex_at_full_cf: float,
    fuel_lcoe: float,
    om_at_full_cf: float,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    return _scale_to_total(
        total,
        capex_at_full_cf / cf,
        pd.Series(fuel_lcoe, index=total.index, dtype="float64"),
        om_at_full_cf / cf,
    )


def _texas_component_lcoe(df: pd.DataFrame) -> tuple[dict[str, pd.Series], str] | None:
    """CAPEX, fuel, and O&M LCOE pieces for the Texas 1 GW formula."""
    ha_units = _ha_units(df)
    gas_aep = _gas_aep(df)
    if ha_units is None or "LM2500 Unit #" not in df.columns or gas_aep is None:
        return None
    lm_units = _col(df, "LM2500 Unit #")
    split_names = _TX_GW_REQUIRED[:12]
    if all(name in df.columns for name in split_names):
        return {
            "solar_capex": _col(df, "Solar CAPEX LCOE at default value"),
            "solar_om": _col(df, "Solar OM LCOE"),
            "wind_capex": _col(df, "Wind CAPEX LCOE w/ default value"),
            "wind_om": _col(df, "Wind OM LCOE"),
            "bess_capex": _col(df, "BESS CAPEX LCOE"),
            "bess_om": _col(df, "BESS OM LCOE"),
            "ha_capex": _col(df, "7HA CAPEX LCOE at default value"),
            "ha_fuel": _col(df, "7HA Fuel LCOE at default value"),
            "ha_om": _col(df, "7HA OM LCOE"),
            "lm_capex": _col(df, "LM2500 CAPEX LCOE at default value"),
            "lm_fuel": _col(df, "LM2500 Fuel LCOE at default value"),
            "lm_om": _col(df, "LM2500 OM LCOE"),
            "ha_units": ha_units,
            "lm_units": lm_units,
            "gas_aep": gas_aep,
        }, "columns"

    totals = (
        "Solar LCOE ($/MWh)",
        "Wind LCOE ($/MWh)",
        "BESS LCOE ($/MWh)",
        "7HA LCOE ($/MWh)",
        "LM2500 LCOE ($/MWh)",
    )
    if any(name not in df.columns for name in totals):
        return None
    solar = _col(df, "Solar LCOE ($/MWh)")
    wind = _col(df, "Wind LCOE ($/MWh)")
    bess = _col(df, "BESS LCOE ($/MWh)")
    ha = _col(df, "7HA LCOE ($/MWh)")
    lm = _col(df, "LM2500 LCOE ($/MWh)")
    ha_mw = ha_units * _HA_MW
    lm_mw = lm_units * _LM_MW
    weight = ha_mw + lm_mw
    ha_share = (ha_mw / weight).where(weight > 0, 0.0)
    # Three 7HAs: Charu prices the combined gas energy as the 7HA alone.
    three = np.isclose(ha_units.to_numpy(dtype="float64"), 3.0, atol=1e-6)
    ha_aep = gas_aep * ha_share
    ha_aep = ha_aep.where(~three, gas_aep)
    lm_aep = gas_aep * (1.0 - ha_share)
    lm_aep = lm_aep.where(~three, 0.0)
    ha_capex, ha_fuel, ha_om = _turbine_pieces(
        ha, _capacity_factor(ha_aep, ha_units, _HA_MW),
        _HA_CAPEX_AT_FULL_CF, _HA_FUEL_LCOE, _HA_OM_AT_FULL_CF,
    )
    lm_capex, lm_fuel, lm_om = _turbine_pieces(
        lm, _capacity_factor(lm_aep, lm_units, _LM_MW),
        _LM_CAPEX_AT_FULL_CF, _LM_FUEL_LCOE, _LM_OM_AT_FULL_CF,
    )
    return {
        "solar_capex": solar * _SOLAR_CAPEX_SHARE,
        "solar_om": solar * (1.0 - _SOLAR_CAPEX_SHARE),
        "wind_capex": wind * _WIND_CAPEX_SHARE,
        "wind_om": wind * (1.0 - _WIND_CAPEX_SHARE),
        "bess_capex": bess * _BESS_CAPEX_SHARE,
        "bess_om": bess * (1.0 - _BESS_CAPEX_SHARE),
        "ha_capex": ha_capex,
        "ha_fuel": ha_fuel,
        "ha_om": ha_om,
        "lm_capex": lm_capex,
        "lm_fuel": lm_fuel,
        "lm_om": lm_om,
        "ha_units": ha_units,
        "lm_units": lm_units,
        "gas_aep": gas_aep,
    }, "technology-lcoe"


def _apply_texas_gw_capex_fuel_lcoe(
    df: pd.DataFrame,
    factors: dict[str, float],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Texas 1 GW: scale each CAPEX and fuel piece, then blend through thermal LCOE."""
    pieces = _texas_component_lcoe(df)
    if pieces is None:
        missing = [name for name in _TX_GW_REQUIRED if name not in df.columns]
        return df, {"applied": False, "reason": "missing-columns", "missing": missing}
    components, piece_source = pieces

    out = df.copy()
    solar_capex = components["solar_capex"]
    solar_om = components["solar_om"]
    wind_capex = components["wind_capex"]
    wind_om = components["wind_om"]
    bess_capex = components["bess_capex"]
    bess_om = components["bess_om"]
    ha_capex = components["ha_capex"]
    ha_fuel = components["ha_fuel"]
    ha_om = components["ha_om"]
    lm_capex = components["lm_capex"]
    lm_fuel = components["lm_fuel"]
    lm_om = components["lm_om"]
    ha_units = components["ha_units"]
    lm_units = components["lm_units"]
    gas_aep = components["gas_aep"]

    solar_user = solar_capex * factors["solar"] + solar_om
    wind_user = wind_capex * factors["wind"] + wind_om
    bess_user = bess_capex * factors["bess"] + bess_om
    ha_user = ha_capex * factors["hdgt"] + ha_fuel * factors["hdFuel"] + ha_om
    lm_user = lm_capex * factors["aero"] + lm_fuel * factors["fuel"] + lm_om
    solar_default = solar_capex + solar_om
    wind_default = wind_capex + wind_om
    bess_default = bess_capex + bess_om
    ha_default = ha_capex + ha_fuel + ha_om
    lm_default = lm_capex + lm_fuel + lm_om

    thermal_user = _thermal_lcoe(ha_user, lm_user, ha_units, lm_units)
    thermal_default = _thermal_lcoe(ha_default, lm_default, ha_units, lm_units)
    solar_aep = _col(out, "Year 1 Solar AEP (kWh)")
    wind_aep = _col(out, "Year 1 Wind AEP (kWh)")
    bess_aep = _col(out, "Year 1 BESS AEP (kWh)")
    total_gwh = _col(out, "Total Yr1 AEP (GWh)")

    def _tx_blend(solar_lcoe, wind_lcoe, bess_lcoe, thermal) -> pd.Series:
        numerator = (
            solar_lcoe * solar_aep
            + wind_lcoe * wind_aep
            + bess_lcoe * bess_aep
            + thermal * gas_aep
        )
        denominator = total_gwh * 1_000_000.0
        return numerator / denominator.where(denominator > 0)

    blended_user = _tx_blend(solar_user, wind_user, bess_user, thermal_user)
    blended_default = _tx_blend(solar_default, wind_default, bess_default, thermal_default)
    adjustment = pd.Series(1.0, index=out.index, dtype="float64")
    valid = blended_default > 0
    if bool(valid.any()):
        ratio = (blended_user.loc[valid] / blended_default.loc[valid]).to_numpy(dtype="float64")
        adjustment.loc[valid] = np.where(np.isfinite(ratio), ratio, 1.0)

    if COL_PROJECT_LCOE_DEFAULT in out.columns:
        project_default = _col(out, COL_PROJECT_LCOE_DEFAULT)
    else:
        project_default = _col(out, COL_PROJECT_LCOE)
    project_user = project_default * adjustment

    out[COL_PROJECT_LCOE_DEFAULT] = project_default
    out[COL_PROJECT_LCOE] = project_user
    out[COL_BLENDED_DEFAULT] = blended_default
    out[COL_BLENDED_USER] = blended_user
    out[COL_ADJUSTMENT] = adjustment
    out[COL_PROJECT_USER] = project_user
    out["Solar CAPEX LCOE adjust w/ user input"] = solar_capex * factors["solar"]
    out["Solar LCOE adjust w/ user CAPEX input"] = solar_user
    out["Wind CAPEX LCOE adjust w/ user input"] = wind_capex * factors["wind"]
    out["Wind LCOE adjust w/ user CAPEX input"] = wind_user
    out["BESS CAPEX LCOE adjust w/ user input"] = bess_capex * factors["bess"]
    out["BESS LCOE adjust w/ user CAPEX inputs"] = bess_user
    out["7HA CAPEX LCOE adjust w/ user input"] = ha_capex * factors["hdgt"]
    out["7HA Fuel LCOE adjust w/ user input"] = ha_fuel * factors["hdFuel"]
    out["7HA LCOE adjust w/ user CAPEX/Fuel inputs"] = ha_user
    out["LM2500 CAPEX LCOE adjust w/ user input"] = lm_capex * factors["aero"]
    out["LM2500 Fuel LCOE adjust w/ user input"] = lm_fuel * factors["fuel"]
    out["LM2500 LCOE adjust w/ user CAPEX/Fuel inputs"] = lm_user
    out["Calculated Thermal LCOE w/ user CAPEX/Fuel inputs"] = thermal_user
    return out, {
        "applied": True,
        "reason": "1000mw-texas",
        "pieces": piece_source,
        "factors": factors,
    }


def _apply_wisconsin_gw_capex_fuel_lcoe(
    df: pd.DataFrame,
    factors: dict[str, float],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Charu's Wisconsin 1 GW formula. 7HA and LM2500 stay separate in the blend."""
    out = df.copy()
    solar_capex = _col(out, "Solar CAPEX LCOE at default value")
    solar_om = _col(out, "Solar OM LCOE")
    wind_capex = _col(out, "Wind CAPEX LCOE w/ default value")
    wind_om = _col(out, "Wind OM LCOE")
    bess_capex = _col(out, "BESS CAPEX LCOE")
    bess_om = _col(out, "BESS OM LCOE")
    ha_capex = _col(out, "7HA CAPEX LCOE at default value")
    ha_fuel = _col(out, "7HA Fuel LCOE at default value")
    ha_om = _col(out, "7HA OM LCOE")
    lm_capex = _col(out, "LM2500 CAPEX LCOE at default value")
    lm_fuel = _col(out, "LM2500 Fuel LCOE at default value")
    lm_om = _col(out, "LM2500 OM LCOE")
    solar_aep = _col(out, "Year 1 Solar AEP (kWh)")
    wind_aep = _col(out, "Year 1 Wind AEP (kWh)")
    bess_aep = _col(out, "Year 1 BESS AEP (kWh)")
    ha_aep = _col(out, "Year 1 7HA AEP (kWh)")
    lm_aep = _col(out, "Year 1 LM2500 AEP (kWh)")
    total_gwh = _col(out, "Total Yr1 AEP (GWh)")

    solar_user = solar_capex * factors["solar"] + solar_om
    wind_user = wind_capex * factors["wind"] + wind_om
    bess_user = bess_capex * factors["bess"] + bess_om
    ha_user = ha_capex * factors["hdgt"] + ha_fuel * factors["hdFuel"] + ha_om
    lm_user = lm_capex * factors["aero"] + lm_fuel * factors["fuel"] + lm_om
    solar_default = solar_capex + solar_om
    wind_default = wind_capex + wind_om
    bess_default = bess_capex + bess_om
    ha_default = ha_capex + ha_fuel + ha_om
    lm_default = lm_capex + lm_fuel + lm_om

    def _wi_blend(solar_lcoe, wind_lcoe, bess_lcoe, ha_lcoe, lm_lcoe) -> pd.Series:
        numerator = (
            solar_lcoe * solar_aep
            + wind_lcoe * wind_aep
            + bess_lcoe * bess_aep
            + ha_lcoe * ha_aep
            + lm_lcoe * lm_aep
        )
        denominator = total_gwh * 1_000_000.0
        return numerator / denominator.where(denominator > 0)

    blended_user = _wi_blend(solar_user, wind_user, bess_user, ha_user, lm_user)
    blended_default = _wi_blend(solar_default, wind_default, bess_default, ha_default, lm_default)
    adjustment = pd.Series(1.0, index=out.index, dtype="float64")
    valid = blended_default > 0
    if bool(valid.any()):
        ratio = (blended_user.loc[valid] / blended_default.loc[valid]).to_numpy(dtype="float64")
        adjustment.loc[valid] = np.where(np.isfinite(ratio), ratio, 1.0)

    if COL_PROJECT_LCOE_DEFAULT in out.columns:
        project_default = _col(out, COL_PROJECT_LCOE_DEFAULT)
    else:
        project_default = _col(out, COL_PROJECT_LCOE)
    project_user = project_default * adjustment

    out[COL_PROJECT_LCOE_DEFAULT] = project_default
    out[COL_PROJECT_LCOE] = project_user
    out[COL_BLENDED_DEFAULT] = blended_default
    out[COL_BLENDED_USER] = blended_user
    out[COL_ADJUSTMENT] = adjustment
    out[COL_PROJECT_USER] = project_user
    out["Solar CAPEX LCOE adjust w/ user input"] = solar_capex * factors["solar"]
    out["Solar LCOE adjust w/ user CAPEX input"] = solar_user
    out["Wind CAPEX LCOE adjust w/ user input"] = wind_capex * factors["wind"]
    out["Wind LCOE adjust w/ user CAPEX input"] = wind_user
    out["BESS CAPEX LCOE adjust w/ user input"] = bess_capex * factors["bess"]
    out["BESS LCOE adjust w/ user CAPEX inputs"] = bess_user
    out["7HA CAPEX LCOE adjust w/ user input"] = ha_capex * factors["hdgt"]
    out["7HA Fuel LCOE adjust w/ user input"] = ha_fuel * factors["hdFuel"]
    out["7HA LCOE adjust w/ user CAPEX/Fuel inputs"] = ha_user
    out["LM2500 CAPEX LCOE adjust w/ user input"] = lm_capex * factors["aero"]
    out["LM2500 Fuel LCOE adjust w/ user input"] = lm_fuel * factors["fuel"]
    out["LM2500 LCOE adjust w/ user CAPEX/Fuel inputs"] = lm_user
    return out, {"applied": True, "reason": "1000mw-wisconsin", "factors": factors}


def apply_capex_fuel_lcoe(
    df: pd.DataFrame,
    technology_capex: dict[str, Any] | None,
    load_mw: object,
    martin_study: object = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Return a frame whose Project LCOE includes the user's CAPEX and gas price.

    The cached study frame is not modified.
    """
    tier = _load_tier(load_mw)
    study = _normalize_study(martin_study)
    if not isinstance(technology_capex, dict):
        return df, {"applied": False, "reason": "no-capex"}

    if tier == 1000 and study == MARTIN_STUDY_WACO:
        factors = capex_fuel_factors(technology_capex, load_mw, basis="tx1000")
        return _apply_texas_gw_capex_fuel_lcoe(df, factors)

    if tier == 1000 and study == MARTIN_STUDY_BADGER:
        missing = [name for name in _WI_GW_REQUIRED if name not in df.columns]
        if missing:
            return df, {"applied": False, "reason": "missing-columns", "missing": missing}
        factors = capex_fuel_factors(technology_capex, load_mw)
        return _apply_wisconsin_gw_capex_fuel_lcoe(df, factors)

    if tier == 1000:
        return df, {"applied": False, "reason": "missing-study"}

    missing = [name for name in _REQUIRED if name not in df.columns]
    if missing:
        return df, {"applied": False, "reason": "missing-columns", "missing": missing}

    factors = capex_fuel_factors(technology_capex, load_mw)
    out = df.copy()

    solar_capex = _col(out, "Solar CAPEX LCOE at default value")
    solar_om = _col(out, "Solar OM LCOE")
    wind_capex = _col(out, "Wind CAPEX LCOE w/ default value")
    wind_om = _col(out, "Wind OM LCOE")
    bess_capex = _col(out, "BESS CAPEX LCOE")
    bess_om = _col(out, "BESS OM LCOE")
    lm_capex = _col(out, "LM2500 CAPEX LCOE at default value")
    lm_fuel = _col(out, "LM2500 Fuel LCOE at default value")
    lm_om = _col(out, "LM2500 OM LCOE")
    solar_aep = _col(out, "Year 1 Solar AEP (kWh)")
    wind_aep = _col(out, "Year 1 Wind AEP (kWh)")
    bess_aep = _col(out, "Year 1 BESS AEP (kWh)")
    lm_aep = _col(out, "Year 1 LM2500 AEP (kWh)")
    total_gwh = _col(out, "Total Yr1 AEP (GWh)")

    solar_user = solar_capex * factors["solar"] + solar_om
    wind_user = wind_capex * factors["wind"] + wind_om
    bess_user = bess_capex * factors["bess"] + bess_om
    lm_user = lm_capex * factors["aero"] + lm_fuel * factors["fuel"] + lm_om

    solar_default = solar_capex + solar_om
    wind_default = wind_capex + wind_om
    bess_default = bess_capex + bess_om
    lm_default = lm_capex + lm_fuel + lm_om

    blended_user = _blend(
        solar_user, wind_user, bess_user, lm_user,
        solar_aep, wind_aep, bess_aep, lm_aep, total_gwh,
    )
    blended_default = _blend(
        solar_default, wind_default, bess_default, lm_default,
        solar_aep, wind_aep, bess_aep, lm_aep, total_gwh,
    )
    adjustment = pd.Series(1.0, index=out.index, dtype="float64")
    valid = blended_default > 0
    if bool(valid.any()):
        ratio = (blended_user.loc[valid] / blended_default.loc[valid]).to_numpy(dtype="float64")
        adjustment.loc[valid] = np.where(np.isfinite(ratio), ratio, 1.0)

    if COL_PROJECT_LCOE_DEFAULT in out.columns:
        project_default = _col(out, COL_PROJECT_LCOE_DEFAULT)
    else:
        project_default = _col(out, COL_PROJECT_LCOE)
    project_user = project_default * adjustment

    out[COL_PROJECT_LCOE_DEFAULT] = project_default
    out[COL_PROJECT_LCOE] = project_user
    out[COL_BLENDED_DEFAULT] = blended_default
    out[COL_BLENDED_USER] = blended_user
    out[COL_ADJUSTMENT] = adjustment
    out[COL_PROJECT_USER] = project_user

    out["Solar CAPEX LCOE adjust w/ user input"] = solar_capex * factors["solar"]
    out["Solar LCOE adjust w/ user CAPEX input"] = solar_user
    out["Solar LCOE ($/MWh)"] = solar_user
    out["Wind CAPEX LCOE adjust w/ user input"] = wind_capex * factors["wind"]
    out["Wind LCOE adjust w/ user CAPEX input"] = wind_user
    out["Wind LCOE ($/MWh)"] = wind_user
    out["BESS CAPEX LCOE adjust w/ user input"] = bess_capex * factors["bess"]
    out["BESS LCOE adjust w/ user CAPEX inputs"] = bess_user
    out["BESS LCOE ($/MWh)"] = bess_user
    out["LM2500 CAPEX LCOE adjust w/ user input"] = lm_capex * factors["aero"]
    out["LM2500 Fuel LCOE adjust w/ user input"] = lm_fuel * factors["fuel"]
    out["LM2500 LCOE adjust w/ user CAPEX/Fuel inputs"] = lm_user
    out["LM2500 LCOE ($/MWh)"] = lm_user

    return out, {"applied": True, "reason": "200mw", "factors": factors}


_request_capex: ContextVar[dict[str, Any] | None] = ContextVar("technology_capex_lcoe", default=None)


def bind_technology_capex(
    technology_capex: dict[str, Any] | None,
    load_mw: object,
    martin_study: object = None,
) -> None:
    """Remember this request's wheels so dataVis reads adjusted project LCOE."""
    study = _normalize_study(martin_study)
    if study is None:
        from configurator.dataVis.loader import get_active_martin_study

        study = _normalize_study(get_active_martin_study())
    if not isinstance(technology_capex, dict):
        _request_capex.set(None)
        return
    _request_capex.set({
        "technologyCapex": technology_capex,
        "loadMW": load_mw,
        "martinStudy": study,
    })


def clear_technology_capex() -> None:
    _request_capex.set(None)


def adjust_dataframe_for_request(df: pd.DataFrame, load_mw: object | None = None) -> pd.DataFrame:
    """Apply the request's CAPEX and gas price when a dataVis handler bound them."""
    spec = _request_capex.get()
    if not spec:
        return df
    tier = spec.get("loadMW") if spec.get("loadMW") is not None else load_mw
    adjusted, _info = apply_capex_fuel_lcoe(
        df,
        spec.get("technologyCapex"),
        tier,
        martin_study=spec.get("martinStudy"),
    )
    return adjusted
