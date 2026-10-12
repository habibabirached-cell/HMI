"""Derived metrics for dataVis exploration."""

from __future__ import annotations

import pandas as pd

CAPEX_COLS = [
    "Solar CAPEX ($ M)",
    "Wind CAPEX ($ M)",
    "7HA CAPEX ($ M)",
    "LM2500 CAPEX ($ M)",
    "BESS CAPEX ($ M)",
]


def add_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    power = out.get("BESS power Nameplate (MW)")
    energy = out.get("BESS initially installed Capacity (MWh)")
    if energy is None:
        energy = out.get("BESS Performance Guarantee (MWh)")
    if power is not None and energy is not None:
        out["dataVis_bess_duration_h"] = energy / power.replace(0, pd.NA)

    solar_dc = out.get("Solar DC Nameplate (MWdc)")
    solar_ac = out.get("Solar AC Nameplate (MWac)")
    if solar_dc is not None and solar_ac is not None:
        out["dataVis_solar_dc_ac_ratio"] = solar_dc / solar_ac.replace(0, pd.NA)

    present_capex = [c for c in CAPEX_COLS if c in out.columns]
    if present_capex:
        out["dataVis_capex_components_m"] = out[present_capex].sum(axis=1, skipna=True)

    return out
