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
    return {
        "solar": _factor(solar, SOLAR_CAPEX_DEFAULT),
        "wind": _factor(wind, WIND_CAPEX_DEFAULT),
        "hdgt": _factor(hdgt, HDGT_CAPEX_DEFAULT),
        "aero": _factor(aero, AERO_CAPEX_DEFAULT),
        "bess": _factor(bess, BESS_CAPEX_DEFAULT),
        "fuel": _factor(fuel, FUEL_PRICE_DEFAULT),
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


def apply_capex_fuel_lcoe(
    df: pd.DataFrame,
    technology_capex: dict[str, Any] | None,
    load_mw: object,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Return a frame whose Project LCOE includes the user's CAPEX and gas price.

    The cached study frame is not modified. When the workbook has no CAPEX / O&M
    split (the 1 GW case), the original frame is returned unchanged.
    """
    if not isinstance(technology_capex, dict):
        return df, {"applied": False, "reason": "no-capex"}

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
