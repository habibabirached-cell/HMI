"""FastAPI routes — prefix /api/configurator/dataVis."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from cluster_peer import cluster_manager
from configurator.conf_capex_lcoe import bind_technology_capex
from configurator.dataVis import service
from configurator.dataVis.schemas import (
    CompareRequest,
    DatasetModeRequest,
    FilterRequest,
    HeatmapRequest,
    HistogramRequest,
    ParallelRequest,
    RowsRequest,
    ScatterRequest,
)

router = APIRouter(prefix="/dataVis", tags=["configurator-dataVis"])


def _open_dataset(body) -> None:
    service.ensure_waco_tier(body.loadMW, body.martinStudy)
    bind_technology_capex(
        getattr(body, "technologyCapex", None),
        body.loadMW,
        getattr(body, "martinStudy", None),
    )


@router.get("/health")
def datavis_health(
    loadMW: int | None = Query(None),
    martinStudy: str | None = Query(None),
):
    service.ensure_waco_tier(loadMW, martinStudy)
    return service.get_health()


@router.post("/dataset-mode")
async def datavis_dataset_mode(body: DatasetModeRequest):
    try:
        _open_dataset(body)
        result = service.apply_dataset_mode(body.mode)
        await cluster_manager.broadcast(
            {"type": "datavis_dataset_mode", "mode": result["mode"], "row_count": result["row_count"]},
        )
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/meta")
def datavis_meta(
    loadMW: int | None = Query(None),
    martinStudy: str | None = Query(None),
):
    try:
        service.ensure_waco_tier(loadMW, martinStudy)
        tier = int(loadMW) if loadMW in (200, 1000) else None
        return service.get_meta(tier, martinStudy)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/column-stats")
def datavis_column_stats(body: FilterRequest):
    try:
        _open_dataset(body)
        filters = [f.model_dump() for f in body.filters]
        return service.get_column_stats(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/filter-row-ids")
def datavis_filter_row_ids(body: FilterRequest):
    try:
        _open_dataset(body)
        filters = [f.model_dump() for f in body.filters]
        return service.get_filtered_row_ids(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/overview")
def datavis_overview(body: FilterRequest):
    try:
        _open_dataset(body)
        filters = [f.model_dump() for f in body.filters]
        return service.get_overview(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/doe-summary")
def datavis_doe_summary(body: FilterRequest):
    try:
        _open_dataset(body)
        filters = [f.model_dump() for f in body.filters]
        return service.get_doe_summary(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/rows")
def datavis_rows(body: RowsRequest):
    try:
        _open_dataset(body)
        return service.get_rows(body.model_dump())
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/scatter")
def datavis_scatter(body: ScatterRequest):
    try:
        _open_dataset(body)
        return service.build_scatter(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/heatmap")
def datavis_heatmap(body: HeatmapRequest):
    try:
        _open_dataset(body)
        return service.build_heatmap(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/histogram")
def datavis_histogram(body: HistogramRequest):
    try:
        _open_dataset(body)
        return service.build_histogram(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chart/parallel")
def datavis_parallel(body: ParallelRequest):
    try:
        _open_dataset(body)
        return service.build_parallel(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/quality")
def datavis_quality(body: FilterRequest):
    try:
        _open_dataset(body)
        filters = [f.model_dump() for f in body.filters]
        return service.get_quality(filters)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/compare")
def datavis_compare(body: CompareRequest):
    try:
        _open_dataset(body)
        return service.compare_rows(body.row_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
