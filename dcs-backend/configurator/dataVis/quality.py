"""Data quality checks for Waco dataset."""

from __future__ import annotations

from typing import Any

import pandas as pd

LOAD_COMPLIANCE_COL = "Year 1 Load Compliance (%)"


def run_quality_checks(df: pd.DataFrame) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    n = len(df)

    checks.append(
        {
            "id": "row_count",
            "title": "Row count",
            "severity": "info",
            "message": f"{n} simulation rows loaded.",
            "count": n,
        }
    )

    if LOAD_COMPLIANCE_COL in df.columns:
        lc = df[LOAD_COMPLIANCE_COL].dropna()
        below_99 = int((lc < 99).sum())
        checks.append(
            {
                "id": "load_compliance_below_99",
                "title": "Load compliance < 99%",
                "severity": "warn" if below_99 else "ok",
                "message": f"{below_99} rows below 99% year-1 load compliance.",
                "count": below_99,
            }
        )

    if "Project LCOE ($/MWh)" in df.columns:
        lcoe = df["Project LCOE ($/MWh)"].dropna()
        neg = int((lcoe < 0).sum())
        checks.append(
            {
                "id": "negative_lcoe",
                "title": "Negative project LCOE",
                "severity": "error" if neg else "ok",
                "message": f"{neg} rows with negative project LCOE.",
                "count": neg,
            }
        )

    if (
        "Project CAPEX ($ M)" in df.columns
        and "dataVis_capex_components_m" in df.columns
    ):
        diff = (df["dataVis_capex_components_m"] - df["Project CAPEX ($ M)"]).abs()
        mismatch = int((diff > 1.0).sum())
        checks.append(
            {
                "id": "capex_reconciliation",
                "title": "Project vs component CAPEX",
                "severity": "warn" if mismatch else "ok",
                "message": f"{mismatch} rows where tech CAPEX sum differs from project CAPEX by > $1M.",
                "count": mismatch,
            }
        )

    dup_cols = [
        "Solar AC Nameplate (MWac)",
        "Wind Nameplate (MWac)",
        "BESS power Nameplate (MW)",
        "BESS Performance Guarantee (MWh)",
        "7HA Unit #",
        "LM2500 Unit #",
    ]
    present = [c for c in dup_cols if c in df.columns]
    if present:
        dups = int(df.duplicated(subset=present, keep=False).sum())
        checks.append(
            {
                "id": "duplicate_doe_inputs",
                "title": "Duplicate DOE input combinations",
                "severity": "warn" if dups else "ok",
                "message": f"{dups} rows share identical DOE inputs with another row.",
                "count": dups,
            }
        )

    null_heavy = []
    for col in df.columns:
        if col == "dataVis_row_id":
            continue
        null_pct = float(df[col].isna().mean())
        if null_pct > 0.05:
            null_heavy.append({"column": col, "null_pct": round(null_pct * 100, 2)})
    checks.append(
        {
            "id": "null_columns",
            "title": "Columns with >5% nulls",
            "severity": "warn" if null_heavy else "ok",
            "message": f"{len(null_heavy)} columns exceed 5% missing values.",
            "details": null_heavy[:20],
            "count": len(null_heavy),
        }
    )

    return checks
