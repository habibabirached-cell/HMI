"""Write load-compliance-clean Martin study CSVs from live CAPEX workbooks."""

from __future__ import annotations

from pathlib import Path

from configurator.dataVis.dataset_mode import filter_load_compliance_clean
from configurator.dataVis.loader import read_martin_excel_dataframe
from configurator.dataVis.paths import (
    DATAVIS_WACO_SHEET,
    badger_clean_csv_path,
    badger_workbook_path,
    waco_clean_csv_path,
    waco_workbook_path,
    waco_workbook_sheet,
)


def export_clean_csv(
    workbook: Path,
    out: Path,
    *,
    sheet_name: str = DATAVIS_WACO_SHEET,
) -> tuple[Path, int, int]:
    if not workbook.is_file():
        raise FileNotFoundError(f"Missing source workbook: {workbook}")

    full = read_martin_excel_dataframe(workbook, sheet_name=sheet_name)
    clean = filter_load_compliance_clean(full)
    clean = clean.reset_index(drop=True)
    clean["dataVis_row_id"] = clean.index.astype(int)

    out.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(out, index=False, lineterminator="\n")
    return out, len(full), len(clean)


def export_waco_tier(tier: int) -> tuple[Path, int, int]:
    return export_clean_csv(
        waco_workbook_path(tier),
        waco_clean_csv_path(tier),
        sheet_name=waco_workbook_sheet(tier),
    )


def export_badger_hollow_creek(load_mw: int = 200) -> tuple[Path, int, int]:
    return export_clean_csv(badger_workbook_path(load_mw), badger_clean_csv_path(load_mw))
