from pathlib import Path

DATA_MARTIN_DIR = (
    Path(__file__).resolve().parents[2] / "configuratorData" / "dataMartin"
)

DATAVIS_WACO_SHEET = "data"

WACO_WORKBOOK_BY_LOAD_MW: dict[int, str] = {
    1000: "Waco_1GW_data_updated_CAPEX.xlsx",
    200: "Waco_200MW_live_CAPEX.xlsx",
}

DEFAULT_WACO_LOAD_MW = 200

# Default workbook path — legacy imports
DATAVIS_WACO_XLSX = DATA_MARTIN_DIR / WACO_WORKBOOK_BY_LOAD_MW[DEFAULT_WACO_LOAD_MW]


def waco_workbook_path(load_mw: int) -> Path:
    name = WACO_WORKBOOK_BY_LOAD_MW.get(int(load_mw))
    if not name:
        raise ValueError(f"Unsupported Waco load tier: {load_mw} MW (expected 200 or 1000).")
    return DATA_MARTIN_DIR / name


def scenario_context_for_load(load_mw: int) -> dict[str, object]:
    firm = int(load_mw)
    return {
        "location": "Waco, Texas",
        "firm_load_mw": firm,
        "annual_load_gwh": firm * 8.76,
        "description": f"Charu DOE — Martin simulation results ({firm} MW firm load)",
    }


SCENARIO_CONTEXT = scenario_context_for_load(DEFAULT_WACO_LOAD_MW)
