#!/usr/bin/env python3
"""Export load-compliance-clean Martin study workbooks (``data`` sheet) to CSV."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from configurator.dataVis.dataset_mode import (
    BESS_CYCLES_COL,
    CLEAN_MIN_BESS_CYCLES_PER_DAY,
    CLEAN_MIN_LOAD_COMPLIANCE,
    LOAD_COMPLIANCE_COL,
)
from configurator.dataVis.export_clean_csv import export_badger_hollow_creek, export_waco_tier
from configurator.dataVis.paths import (
    BADGER_WORKBOOK_BY_LOAD_MW,
    WACO_WORKBOOK_BY_LOAD_MW,
    badger_workbook_path,
    waco_workbook_path,
)


def _summary_line(source_name: str, out: Path, full_rows: int, clean_rows: int) -> str:
    return (
        f"{source_name} ({full_rows} rows) -> {out.name} ({clean_rows} rows, "
        f"{LOAD_COMPLIANCE_COL} >= {CLEAN_MIN_LOAD_COMPLIANCE}, "
        f"{BESS_CYCLES_COL} >= {CLEAN_MIN_BESS_CYCLES_PER_DAY:.5f})"
    )


def main() -> None:
    summaries: list[str] = []

    out, full_rows, clean_rows = export_waco_tier(200)
    summaries.append(
        _summary_line(WACO_WORKBOOK_BY_LOAD_MW[200], out, full_rows, clean_rows)
    )

    out, full_rows, clean_rows = export_badger_hollow_creek(200)
    summaries.append(_summary_line(badger_workbook_path(200).name, out, full_rows, clean_rows))

    badger_1gw = badger_workbook_path(1000)
    if badger_1gw.is_file():
        out, full_rows, clean_rows = export_badger_hollow_creek(1000)
        summaries.append(
            _summary_line(BADGER_WORKBOOK_BY_LOAD_MW[1000], out, full_rows, clean_rows)
        )
    else:
        summaries.append(
            f"Skipped Badger 1000 MW ({badger_1gw.name} not present; kept existing clean CSV if any)"
        )

    workbook_1gw = waco_workbook_path(1000)
    if workbook_1gw.is_file():
        out, full_rows, clean_rows = export_waco_tier(1000)
        summaries.append(
            _summary_line(WACO_WORKBOOK_BY_LOAD_MW[1000], out, full_rows, clean_rows)
        )
    else:
        summaries.append(
            f"Skipped 1000 MW ({workbook_1gw.name} not present; kept existing clean CSV if any)"
        )

    print("\n".join(summaries))


if __name__ == "__main__":
    main()
