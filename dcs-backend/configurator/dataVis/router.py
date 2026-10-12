"""FastAPI routes — prefix /api/configurator/dataVis."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from configurator.dataVis import service
from configurator.dataVis.schemas import (
    CompareRequest,
    FilterRequest,
    HeatmapRequest,
    ParallelRequest,
    RowsRequest,
    ScatterRequest,
)

router = APIRouter(prefix="/dataVis", tags=["configurator-dataVis"])


@router.get("/health")
def datavis_health():
    return service.get_health()


@router.get("/meta")
def datavis_meta():
    try:
        return service.get_meta()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/overview")
def datavis_overview(body: FilterRequest):
    try:
        filters = [f.model_dump() for f in body.filters]
        return service.get_overview(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/doe-summary")
def datavis_doe_summary(body: FilterRequest):
    try:
        filters = [f.model_dump() for f in body.filters]
        return service.get_doe_summary(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/rows")
def datavis_rows(body: RowsRequest):
    try:
        return service.get_rows(body.model_dump())
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/scatter")
def datavis_scatter(body: ScatterRequest):
    try:
        return service.build_scatter(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/heatmap")
def datavis_heatmap(body: HeatmapRequest):
    try:
        return service.build_heatmap(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/parallel")
def datavis_parallel(body: ParallelRequest):
    try:
        return service.build_parallel(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/quality")
def datavis_quality(body: FilterRequest):
    try:
        filters = [f.model_dump() for f in body.filters]
        return service.get_quality(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/compare")
def datavis_compare(body: CompareRequest):
    try:
        return service.compare_rows(body.row_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
