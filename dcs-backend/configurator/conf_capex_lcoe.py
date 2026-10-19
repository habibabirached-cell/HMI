"""Scale Martin 200 MW project LCOE when the user changes installed CAPEX or gas price.

The study LCOEs were built at fixed prices (solar $1,600/kW, wind $2,000/kW,
LM2500 $3,000/kW, battery $238/kWh, gas $3.50/MMBtu). Only the CAPEX piece of
each technology LCOE is scaled, plus the LM2500 fuel piece. O&M stays put.
The energy-weighted blend of those updated LCOEs, divided by the blend at the
study prices, is the factor applied to Project LCOE.

Heavy-duty (7HA) CAPEX is not used on the 200 MW case. The 1 GW workbook does
not yet carry the CAPEX / O&M / fuel split, so those rows are left unchanged.
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


def capex_fuel_factors(technology_capex: dict[str, Any] | None, load_mw: object) -> dict[str, float]:
    """Scaling factors from the Ideum wheels. Missing prices stay at the study default."""
    capex = technology_capex if isinstance(technology_capex, dict) else {}
    solar = wheel_unit_capex((capex.get("solar") or {}).get("capexPerKwAc"), load_mw)
    wind = wheel_unit_capex((capex.get("wind") or {}).get("capexPerKw"), load_mw)
    hdgt = wheel_unit_capex((capex.get("heavyDutyGT") or {}).get("capexPerKw"), load_mw)
    aero = wheel_unit_capex((capex.get("aeroderivativeGT") or {}).get("capexPerKw"), load_mw)
    bess = wheel_unit_capex((capex.get("battery") or {}).get("capexPerKwh"), load_mw)
    fuel = _positive((capex.get("aeroderivativeGT") or {}).get("gasPricePerMmbtu"), FUEL_PRICE_DEFAULT)
    hd_fuel = _positive((capex.get("heavyDutyGT") or {}).get("gasPricePerMmbtu"), FUEL_PRICE_DEFAULT)
    return {
        "solar": _factor(solar, SOLAR_CAPEX_DEFAULT),
        "wind": _factor(wind, WIND_CAPEX_DEFAULT),
        "hdgt": _factor(hdgt, HDGT_CAPEX_DEFAULT),
        "aero": _factor(aero, AERO_CAPEX_DEFAULT),
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


# Capital fraction of each technology LCOE at the study prices, measured on the
# 200 MW sheet (CAPEX LCOE / technology LCOE). The 1 GW sheet only stores the
# combined technology LCOE, so the same fractions scale its CAPEX piece.
_GW_CAPEX_SHARE = {
    "solar": 0.943,
    "wind": 0.890,
    "bess": 0.802,
    "aero": 0.907,
    "hdgt": 0.907,
}
_GW_FUEL_SHARE = 0.026
_GW_COLUMNS = (
    "Solar LCOE ($/MWh)",
    "Wind LCOE ($/MWh)",
    "BESS LCOE ($/MWh)",
    "7HA LCOE ($/MWh)",
    "LM2500 LCOE ($/MWh)",
    "Year 1 Solar AEP (kWh)",
    "Year 1 Wind AEP (kWh)",
    "Year 1 BESS AEP (kWh)",
    "Year 1 7HA+LM2500 AEP (kWh)",
    "Total Yr1 AEP (GWh)",
    COL_PROJECT_LCOE,
)


def _scale_capital(total: pd.Series, capex_share: float, adj: float) -> pd.Series:
    return total * (capex_share * adj + (1.0 - capex_share))


def _scale_turbine(
    total: pd.Series,
    capex_share: float,
    fuel_share: float,
    capex_adj: float,
    fuel_adj: float,
) -> pd.Series:
    om_share = max(0.0, 1.0 - capex_share - fuel_share)
    return total * (capex_share * capex_adj + fuel_share * fuel_adj + om_share)


def _project_adjustment(
    out: pd.DataFrame,
    blended_user: pd.Series,
    blended_default: pd.Series,
) -> tuple[pd.Series, pd.Series]:
    adjustment = pd.Series(1.0, index=out.index, dtype="float64")
    valid = blended_default > 0
    if bool(valid.any()):
        ratio = (blended_user.loc[valid] / blended_default.loc[valid]).to_numpy(dtype="float64")
        adjustment.loc[valid] = np.where(np.isfinite(ratio), ratio, 1.0)
    if COL_PROJECT_LCOE_DEFAULT in out.columns:
        project_default = _col(out, COL_PROJECT_LCOE_DEFAULT)
    else:
        project_default = _col(out, COL_PROJECT_LCOE)
    return project_default, project_default * adjustment


def _apply_gw_capex_fuel_lcoe(
    df: pd.DataFrame,
    factors: dict[str, float],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """1 GW sheet has technology LCOEs but not the CAPEX / O&M / fuel split."""
    missing = [name for name in _GW_COLUMNS if name not in df.columns]
    if missing:
        return df, {"applied": False, "reason": "missing-columns", "missing": missing}

    out = df.copy()
    solar = _col(out, "Solar LCOE ($/MWh)")
    wind = _col(out, "Wind LCOE ($/MWh)")
    bess = _col(out, "BESS LCOE ($/MWh)")
    ha = _col(out, "7HA LCOE ($/MWh)")
    lm = _col(out, "LM2500 LCOE ($/MWh)")
    solar_aep = _col(out, "Year 1 Solar AEP (kWh)")
    wind_aep = _col(out, "Year 1 Wind AEP (kWh)")
    bess_aep = _col(out, "Year 1 BESS AEP (kWh)")
    gas_aep = _col(out, "Year 1 7HA+LM2500 AEP (kWh)")
    ha_capex = _col(out, "7HA CAPEX ($ M)")
    lm_capex = _col(out, "LM2500 CAPEX ($ M)")
    capex_sum = ha_capex + lm_capex
    ha_share = (ha_capex / capex_sum).where(capex_sum > 0, 0.0)
    # A row with gas energy but no dollar split keeps that energy on the 7HA.
    ha_share = ha_share.where(capex_sum > 0, 1.0)
    ha_aep = gas_aep * ha_share
    lm_aep = gas_aep * (1.0 - ha_share)
    total_gwh = _col(out, "Total Yr1 AEP (GWh)")

    solar_user = _scale_capital(solar, _GW_CAPEX_SHARE["solar"], factors["solar"])
    wind_user = _scale_capital(wind, _GW_CAPEX_SHARE["wind"], factors["wind"])
    bess_user = _scale_capital(bess, _GW_CAPEX_SHARE["bess"], factors["bess"])
    ha_user = _scale_turbine(ha, _GW_CAPEX_SHARE["hdgt"], _GW_FUEL_SHARE, factors["hdgt"], factors["hdFuel"])
    lm_user = _scale_turbine(lm, _GW_CAPEX_SHARE["aero"], _GW_FUEL_SHARE, factors["aero"], factors["fuel"])

    def _gw_blend(solar_lcoe, wind_lcoe, bess_lcoe, ha_lcoe, lm_lcoe) -> pd.Series:
        numerator = (
            solar_lcoe * solar_aep
            + wind_lcoe * wind_aep
            + bess_lcoe * bess_aep
            + ha_lcoe * ha_aep
            + lm_lcoe * lm_aep
        )
        denominator = total_gwh * 1_000_000.0
        return numerator / denominator.where(denominator > 0)

    blended_user = _gw_blend(solar_user, wind_user, bess_user, ha_user, lm_user)
    blended_default = _gw_blend(solar, wind, bess, ha, lm)
    project_default, project_user = _project_adjustment(out, blended_user, blended_default)
    adjustment = pd.Series(1.0, index=out.index, dtype="float64")
    valid = project_default > 0
    if bool(valid.any()):
        ratio = (project_user.loc[valid] / project_default.loc[valid]).to_numpy(dtype="float64")
        adjustment.loc[valid] = np.where(np.isfinite(ratio), ratio, 1.0)

    out[COL_PROJECT_LCOE_DEFAULT] = project_default
    out[COL_PROJECT_LCOE] = project_user
    out[COL_BLENDED_DEFAULT] = blended_default
    out[COL_BLENDED_USER] = blended_user
    out[COL_ADJUSTMENT] = adjustment
    out[COL_PROJECT_USER] = project_user
    out["Solar LCOE ($/MWh)"] = solar_user
    out["Wind LCOE ($/MWh)"] = wind_user
    out["BESS LCOE ($/MWh)"] = bess_user
    out["7HA LCOE ($/MWh)"] = ha_user
    out["LM2500 LCOE ($/MWh)"] = lm_user
    return out, {"applied": True, "reason": "1000mw", "factors": factors}


def apply_capex_fuel_lcoe(
    df: pd.DataFrame,
    technology_capex: dict[str, Any] | None,
    load_mw: object,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Return a frame whose Project LCOE includes the user's CAPEX and gas price.

    The cached study frame is not modified.
    """
    if not isinstance(technology_capex, dict):
        return df, {"applied": False, "reason": "no-capex"}

    missing = [name for name in _REQUIRED if name not in df.columns]
    if missing:
        factors = capex_fuel_factors(technology_capex, load_mw)
        return _apply_gw_capex_fuel_lcoe(df, factors)

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


def bind_technology_capex(technology_capex: dict[str, Any] | None, load_mw: object) -> None:
    """Remember this request's wheels so dataVis reads adjusted project LCOE."""
    if not isinstance(technology_capex, dict):
        _request_capex.set(None)
        return
    _request_capex.set({"technologyCapex": technology_capex, "loadMW": load_mw})


def clear_technology_capex() -> None:
    _request_capex.set(None)


def adjust_dataframe_for_request(df: pd.DataFrame, load_mw: object | None = None) -> pd.DataFrame:
    """Apply the request's CAPEX and gas price when a dataVis handler bound them."""
    spec = _request_capex.get()
    if not spec:
        return df
    tier = spec.get("loadMW") if spec.get("loadMW") is not None else load_mw
    adjusted, _info = apply_capex_fuel_lcoe(df, spec.get("technologyCapex"), tier)
    return adjusted
