from pathlib import Path

DATAVIS_WACO_XLSX = (
    Path(__file__).resolve().parents[2]
    / "configuratorData"
    / "dataMartin"
    / "Waco_1GW_data.xlsx"
)
DATAVIS_WACO_SHEET = "1GW Plant data"

SCENARIO_CONTEXT = {
    "location": "Waco, Texas",
    "firm_load_mw": 1000,
    "annual_load_gwh": 8760.0,
    "description": "Charu DOE — Martin simulation results (1 GW firm load)",
}
