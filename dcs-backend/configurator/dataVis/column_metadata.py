"""Column dictionary for Waco 1 GW dataset (UI + API)."""

from __future__ import annotations

from typing import Any

ColumnMeta = dict[str, Any]

COLUMNS: list[ColumnMeta] = [
    {
        "key": "Solar AC Nameplate (MWac)",
        "label": "Solar AC nameplate",
        "role": "input",
        "group": "Solar",
        "unit": "MWac",
        "description": "DOE input — solar AC capacity.",
    },
    {
        "key": "Wind Nameplate (MWac)",
        "label": "Wind AC nameplate",
        "role": "input",
        "group": "Wind",
        "unit": "MWac",
    },
    {
        "key": "BESS power Nameplate (MW)",
        "label": "BESS power nameplate",
        "role": "input",
        "group": "BESS",
        "unit": "MW",
    },
    {
        "key": "BESS Performance Guarantee (MWh)",
        "label": "BESS performance guarantee",
        "role": "input",
        "group": "BESS",
        "unit": "MWh",
    },
    {
        "key": "7HA Unit #",
        "label": "7HA unit count",
        "role": "input",
        "group": "Thermal",
        "unit": "count",
    },
    {
        "key": "LM2500 Unit #",
        "label": "LM2500 unit count",
        "role": "input",
        "group": "Thermal",
        "unit": "count",
    },
    {
        "key": "Carbon Free Energy (%)",
        "label": "Carbon-free energy",
        "role": "output",
        "group": "Environment",
        "unit": "%",
    },
    {
        "key": "Project LCOE ($/MWh)",
        "label": "Project LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "Year 1 Capacity Factor (%)",
        "label": "Year 1 capacity factor",
        "role": "output",
        "group": "Reliability",
        "unit": "%",
    },
    {
        "key": "Annual Load Compliance (%)",
        "label": "Annual load compliance",
        "role": "output",
        "group": "Reliability",
        "unit": "%",
    },
    {
        "key": "Solar LCOE ($/MWh)",
        "label": "Solar LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "Wind LCOE ($/MWh)",
        "label": "Wind LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "7HA LCOE ($/MWh)",
        "label": "7HA LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "LM2500 LCOE ($/MWh)",
        "label": "LM2500 LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "BESS LCOE ($/MWh)",
        "label": "BESS LCOE",
        "role": "output",
        "group": "Economics",
        "unit": "$/MWh",
    },
    {
        "key": "Project CAPEX ($ M)",
        "label": "Project CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "Solar CAPEX ($ M)",
        "label": "Solar CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "Wind CAPEX ($ M)",
        "label": "Wind CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "7HA CAPEX ($ M)",
        "label": "7HA CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "LM2500 CAPEX ($ M)",
        "label": "LM2500 CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "BESS CAPEX ($ M)",
        "label": "BESS CAPEX",
        "role": "output",
        "group": "Economics",
        "unit": "$M",
    },
    {
        "key": "Total Yr1 AEP (GWh)",
        "label": "Total year-1 AEP",
        "role": "output",
        "group": "Energy",
        "unit": "GWh",
    },
    {
        "key": "Year 1 Curtailment (%)",
        "label": "Year 1 curtailment",
        "role": "output",
        "group": "Energy",
        "unit": "%",
    },
    {
        "key": "Carbon Density (lb CO2/MWh)",
        "label": "Carbon density",
        "role": "output",
        "group": "Environment",
        "unit": "lb CO2/MWh",
    },
    {
        "key": "Solar DC Nameplate (MWdc)",
        "label": "Solar DC nameplate",
        "role": "output",
        "group": "Solar",
        "unit": "MWdc",
    },
    {
        "key": "Wind Turbine Unit #",
        "label": "Wind turbine count",
        "role": "output",
        "group": "Wind",
        "unit": "count",
    },
    {
        "key": "BESS usage (cycle/day)",
        "label": "BESS usage",
        "role": "output",
        "group": "BESS",
        "unit": "cycles/day",
    },
    {
        "key": "dataVis_bess_duration_h",
        "label": "BESS duration (derived)",
        "role": "derived",
        "group": "BESS",
        "unit": "h",
        "description": "Installed BESS MWh / BESS power MW.",
    },
    {
        "key": "dataVis_solar_dc_ac_ratio",
        "label": "Solar DC/AC ratio (derived)",
        "role": "derived",
        "group": "Solar",
        "unit": "ratio",
    },
    {
        "key": "dataVis_capex_components_m",
        "label": "Tech CAPEX sum (derived)",
        "role": "derived",
        "group": "Economics",
        "unit": "$M",
    },
]

COLUMN_BY_KEY = {c["key"]: c for c in COLUMNS}

DEFAULT_SCATTER_X = "Solar AC Nameplate (MWac)"
DEFAULT_SCATTER_Y = "Project LCOE ($/MWh)"
DEFAULT_SCATTER_COLOR = "Annual Load Compliance (%)"
DEFAULT_HEATMAP_X = "Solar AC Nameplate (MWac)"
DEFAULT_HEATMAP_Y = "Wind Nameplate (MWac)"
DEFAULT_HEATMAP_Z = "Annual Load Compliance (%)"

PARALLEL_DEFAULT_DIMS = [
    "Solar AC Nameplate (MWac)",
    "Wind Nameplate (MWac)",
    "BESS power Nameplate (MW)",
    "7HA Unit #",
    "LM2500 Unit #",
    "Project LCOE ($/MWh)",
    "Annual Load Compliance (%)",
    "Carbon Free Energy (%)",
]
