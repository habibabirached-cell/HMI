from pathlib import Path

DATA_MARTIN_DIR = (
    Path(__file__).resolve().parents[2] / "configuratorData" / "dataMartin"
)

DATAVIS_WACO_SHEET = "data"

WACO_WORKBOOK_BY_LOAD_MW: dict[int, str] = {
    1000: "Waco_1GW_data_updated_CAPEX.xlsx",
    200: "Waco_200MW_live_CAPEX.xlsx",
}

# Pre-built from Excel via scripts/build_waco_clean_csv.py (load compliance >= 97%).
WACO_CLEAN_CSV_BY_LOAD_MW: dict[int, str] = {
    200: "Waco_200MW_clean.csv",
    1000: "Waco_1000MW_clean.csv",
}

DEFAULT_WACO_LOAD_MW = 1000

BADGER_WORKBOOK_BY_LOAD_MW: dict[int, str] = {
    200: "Badger_Hollow_Creek_200MW_live_CAPEX.xlsx",
    1000: "Badger_Hollow_Creek_1GW_live_CAPEX.xlsx",
}

BADGER_CLEAN_CSV_BY_LOAD_MW: dict[int, str] = {
    200: "Badger_Hollow_Creek_200MW_clean.csv",
    1000: "Badger_Hollow_Creek_1000MW_clean.csv",
}

# 200 MW names kept for callers that still import the single-file constants.
BADGER_WORKBOOK = BADGER_WORKBOOK_BY_LOAD_MW[200]
BADGER_CLEAN_CSV = BADGER_CLEAN_CSV_BY_LOAD_MW[200]

MARTIN_STUDY_WACO = "waco"
MARTIN_STUDY_BADGER = "badger_hollow_creek"
MARTIN_STUDIES = frozenset({MARTIN_STUDY_WACO, MARTIN_STUDY_BADGER})

# Default workbook path — legacy imports
DATAVIS_WACO_XLSX = DATA_MARTIN_DIR / WACO_WORKBOOK_BY_LOAD_MW[DEFAULT_WACO_LOAD_MW]


def waco_workbook_path(load_mw: int) -> Path:
    name = WACO_WORKBOOK_BY_LOAD_MW.get(int(load_mw))
    if not name:
        raise ValueError(f"Unsupported Waco load tier: {load_mw} MW (expected 200 or 1000).")
    return DATA_MARTIN_DIR / name


def badger_workbook_path(load_mw: int = 200) -> Path:
    name = BADGER_WORKBOOK_BY_LOAD_MW.get(int(load_mw))
    if not name:
        raise ValueError(f"Unsupported Badger load tier: {load_mw} MW (expected 200 or 1000).")
    return DATA_MARTIN_DIR / name


def badger_clean_csv_path(load_mw: int = 200) -> Path:
    name = BADGER_CLEAN_CSV_BY_LOAD_MW.get(int(load_mw))
    if not name:
        raise ValueError(f"Unsupported Badger load tier: {load_mw} MW (expected 200 or 1000).")
    return DATA_MARTIN_DIR / name


def badger_dataset_source(load_mw: int = 200) -> dict[str, str]:
    tier = int(load_mw)
    csv_path = badger_clean_csv_path(tier)
    if csv_path.is_file():
        return {
            "kind": "csv",
            "file": csv_path.name,
            "source_workbook": BADGER_WORKBOOK_BY_LOAD_MW[tier],
            "martin_study": MARTIN_STUDY_BADGER,
        }
    workbook = badger_workbook_path(tier)
    return {
        "kind": "xlsx",
        "file": workbook.name,
        "sheet": DATAVIS_WACO_SHEET,
        "martin_study": MARTIN_STUDY_BADGER,
    }


def martin_study_from_state_id(state_id: object) -> str:
    if str(state_id or "").lower() == "wisconsin":
        return MARTIN_STUDY_BADGER
    return MARTIN_STUDY_WACO


def scenario_context_for_badger(load_mw: int = 200) -> dict[str, object]:
    firm = int(load_mw) if int(load_mw) in (200, 1000) else 200
    return {
        "location": "Badger Hollow Creek, Wisconsin",
        "firm_load_mw": firm,
        "annual_load_gwh": firm * 8.76,
        "description": f"Charu DOE — Martin simulation results ({firm} MW firm load)",
        "martin_study": MARTIN_STUDY_BADGER,
    }


def waco_clean_csv_path(load_mw: int) -> Path:
    name = WACO_CLEAN_CSV_BY_LOAD_MW.get(int(load_mw))
    if not name:
        raise ValueError(f"Unsupported Waco load tier: {load_mw} MW (expected 200 or 1000).")
    return DATA_MARTIN_DIR / name


def waco_dataset_source(load_mw: int) -> dict[str, str]:
    """Describe the on-disk dataset the API loads (clean CSV when present)."""
    tier = int(load_mw)
    csv_path = waco_clean_csv_path(tier)
    if csv_path.is_file():
        return {
            "kind": "csv",
            "file": csv_path.name,
            "source_workbook": WACO_WORKBOOK_BY_LOAD_MW[tier],
            "martin_study": MARTIN_STUDY_WACO,
        }
    workbook = waco_workbook_path(tier)
    return {
        "kind": "xlsx",
        "file": workbook.name,
        "sheet": DATAVIS_WACO_SHEET,
        "martin_study": MARTIN_STUDY_WACO,
    }


def scenario_context_for_load(load_mw: int) -> dict[str, object]:
    firm = int(load_mw)
    return {
        "location": "Waco, Texas",
        "firm_load_mw": firm,
        "annual_load_gwh": firm * 8.76,
        "description": f"Charu DOE — Martin simulation results ({firm} MW firm load)",
        "martin_study": MARTIN_STUDY_WACO,
    }


SCENARIO_CONTEXT = scenario_context_for_load(DEFAULT_WACO_LOAD_MW)
