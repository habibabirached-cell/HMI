"""Filter application for dataVis queries."""

from __future__ import annotations

from typing import Any

import pandas as pd

FilterSpec = dict[str, Any]


def apply_filters(df: pd.DataFrame, filters: list[FilterSpec] | None) -> pd.DataFrame:
    if not filters:
        return df
    out = df
    for f in filters:
        col = f.get("column")
        if not col or col not in out.columns:
            continue
        op = f.get("op", "eq")
        series = out[col]
        if op == "range":
            lo, hi = f.get("min"), f.get("max")
            if lo is not None:
                out = out[series >= lo]
                series = out[col]
            if hi is not None:
                out = out[series <= hi]
        elif op == "in":
            values = f.get("values") or []
            if values:
                out = out[series.isin(values)]
        elif op == "gte":
            out = out[series >= f.get("value")]
        elif op == "lte":
            out = out[series <= f.get("value")]
        elif op == "eq":
            out = out[series == f.get("value")]
    return out
