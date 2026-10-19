#!/usr/bin/env python3
"""Export load-compliance-clean Waco tiers (200 MW / 1000 MW) to CSV on disk."""

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
from configurator.dataVis.export_clean_csv import export_waco_tier
from configurator.dataVis.paths import WACO_WORKBOOK_BY_LOAD_MW, waco_workbook_path


def export_tier(tier: int) -> tuple[Path, int, int]:
    return export_waco_tier(tier)


def main() -> None:
    summaries: list[str] = []
    for tier in (200, 1000):
        workbook = waco_workbook_path(tier)
        if not workbook.is_file():
            summaries.append(f"Skipped {tier} MW: missing {workbook.name}")
            continue
        out, full_rows, clean_rows = export_tier(tier)
        summaries.append(
            f"{tier} MW: {WACO_WORKBOOK_BY_LOAD_MW[tier]} "
            f"({full_rows} rows) -> {out.name} ({clean_rows} rows, "
            f"{LOAD_COMPLIANCE_COL} >= {CLEAN_MIN_LOAD_COMPLIANCE}, "
            f"{BESS_CYCLES_COL} >= {CLEAN_MIN_BESS_CYCLES_PER_DAY:.5f})"
        )
    print("\n".join(summaries))


if __name__ == "__main__":
    main()
