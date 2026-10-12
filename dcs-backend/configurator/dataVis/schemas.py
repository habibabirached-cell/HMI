"""Pydantic models for dataVis API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class FilterSpec(BaseModel):
    column: str
    op: Literal["range", "in", "gte", "lte", "eq"] = "range"
    min: float | None = None
    max: float | None = None
    value: float | None = None
    values: list[float | int | str] | None = None


class FilterRequest(BaseModel):
    filters: list[FilterSpec] = Field(default_factory=list)


class RowsRequest(FilterRequest):
    offset: int = 0
    limit: int = 100
    columns: list[str] | None = None
    sort_column: str | None = None
    sort_asc: bool = True


class ScatterRequest(FilterRequest):
    x: str
    y: str
    color: str | None = None
    size: str | None = None
    max_points: int = 5000


class HeatmapRequest(FilterRequest):
    x: str
    y: str
    z: str
    agg: Literal["mean", "median", "min", "max", "count"] = "mean"
    x_bins: int = 25
    y_bins: int = 25


class ParallelRequest(FilterRequest):
    dimensions: list[str]
    color: str | None = "Project LCOE ($/MWh)"  # parallel coords line color
    max_rows: int = 2000


class HistogramRequest(FilterRequest):
    column: str


class CompareRequest(BaseModel):
    row_ids: list[int] = Field(..., min_length=1, max_length=8)
