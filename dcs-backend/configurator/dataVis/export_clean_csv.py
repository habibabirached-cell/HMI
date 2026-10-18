"""Write load-compliance-clean Martin study CSVs from live CAPEX workbooks."""

from __future__ import annotations

from pathlib import Path

from configurator.dataVis.dataset_mode import filter_load_compliance_clean
from configurator.dataVis.loader import read_martin_excel_dataframe
from configurator.dataVis.paths import (
    badger_clean_csv_path,
    badger_workbook_path,
    waco_clean_csv_path,
    waco_workbook_path,
)


def export_clean_csv(workbook: Path, out: Path) -> tuple[Path, int, int]:
    if not workbook.is_file():
        raise FileNotFoundError(f"Missing source workbook: {workbook}")

    full = read_martin_excel_dataframe(workbook)
    clean = filter_load_compliance_clean(full)
    clean = clean.reset_index(drop=True)
    clean["dataVis_row_id"] = clean.index.astype(int)

    out.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(out, index=False)
    return out, len(full), len(clean)


def export_waco_tier(tier: int) -> tuple[Path, int, int]:
    return export_clean_csv(waco_workbook_path(tier), waco_clean_csv_path(tier))


def export_badger_hollow_creek() -> tuple[Path, int, int]:
    return export_clean_csv(badger_workbook_path(), badger_clean_csv_path())
