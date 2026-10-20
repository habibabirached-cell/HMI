"""Data Center Configurator API routes (synthetic prototype)."""

from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException, Query

from cluster_peer import cluster_manager, resolve_machine_role
from configurator.cluster_explore_sync import get_last_explore_data_sync, remember_explore_data_sync
from configurator.cluster_state import (
    close_configurator_wall_cluster,
    get_configurator_session,
    submit_configurator_cluster,
)
from configurator.conf_consolidated import generate_configurator_result
from configurator.conf_martin import generate_martin_configurator_result
from configurator.conf_schemas import (
    ConfiguratorGenerateResponse,
    ConfiguratorInputs,
    WacoPreloadRequest,
)
from configurator.dataVis.dataset_mode import reset_datavis_mode
from configurator.dataVis.loader import (
    begin_martin_csv_load,
    load_martin_dataframe,
)
from configurator.dataVis.paths import (
    MARTIN_STUDY_BADGER,
    MARTIN_STUDIES,
    badger_dataset_source,
    martin_study_from_state_id,
    waco_dataset_source,
)
from configurator.dataVis.router import router as datavis_router

router = APIRouter(prefix="/api/configurator", tags=["configurator"])
router.include_router(datavis_router)


async def _forward_cluster_submit_to_peer(peer_base: str, body: dict) -> dict:
    """Ideum backend → Maingear peer (browser stays same-origin on Ideum)."""
    url = f"{peer_base.rstrip('/')}/api/configurator/cluster/submit"

    def _post() -> tuple[dict, int]:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8")), resp.status
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                detail = parsed.get("detail", raw)
            except json.JSONDecodeError:
                detail = raw or exc.reason
            return {"detail": detail}, exc.code
        except urllib.error.URLError as exc:
            return {"detail": f"Could not reach Maingear at {peer_base}: {exc.reason}"}, 502

    payload, status = await asyncio.to_thread(_post)
    if status >= 400:
        raise HTTPException(
            status_code=status,
            detail=payload.get("detail", f"Maingear cluster submit failed ({status})"),
        )
    return payload


async def _run_maingear_cluster_submit(body: dict) -> dict:
    source = (body.get("source") or "ideum").strip()
    pipeline = (body.get("pipeline") or "legacy").strip().lower()
    payload = {k: v for k, v in body.items() if k not in ("source", "pipeline")}
    try:
        inputs = ConfiguratorInputs(**payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    inputs_dict = inputs.model_dump()

    async def broadcast(message: dict) -> int:
        return await cluster_manager.broadcast(message)

    if pipeline == "martin":
        session = await submit_configurator_cluster(
            inputs_dict,
            source=source or "ideum-martin",
            run_engine=generate_martin_configurator_result,
            broadcast=broadcast,
        )
    else:
        session = await submit_configurator_cluster(
            inputs_dict,
            source=source,
            run_engine=generate_configurator_result,
            broadcast=broadcast,
        )
    return {"ok": True, "session": session}


@router.get("/health")
async def configurator_health():
    return {"ok": True, "module": "configurator", "mode": "synthetic"}


@router.post("/generate", response_model=ConfiguratorGenerateResponse)
async def generate_configuration(body: dict, pipeline: str = "legacy"):
    datavis_filters = body.get("dataVisFilters") if isinstance(body.get("dataVisFilters"), list) else None
    payload = {k: v for k, v in body.items() if k != "dataVisFilters"}
    try:
        inputs_model = ConfiguratorInputs(**payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    inputs = inputs_model.model_dump()
    if (pipeline or "legacy").strip().lower() == "martin":
        result = generate_martin_configurator_result(inputs, datavis_filters=datavis_filters)
    else:
        result = generate_configurator_result(inputs)
    payload = dict(result)
    payload.setdefault("source", "backend")
    return ConfiguratorGenerateResponse(**payload)


def _waco_tier_from_load_mw(load_mw: object) -> int | None:
    try:
        tier = int(round(float(load_mw)))
    except (TypeError, ValueError):
        return None
    return tier if tier in (200, 1000) else None


def _resolve_martin_study(martin_study: object, state_id: object = None) -> str:
    if isinstance(martin_study, str) and martin_study in MARTIN_STUDIES:
        return martin_study
    return martin_study_from_state_id(state_id)


def _preload_martin_workbook(
    load_mw: int | None = None,
    *,
    martin_study: str | None = None,
    state_id: object = None,
) -> dict:
    token = begin_martin_csv_load()
    study = _resolve_martin_study(martin_study, state_id)
    tier = _waco_tier_from_load_mw(load_mw)
    if tier is None:
        raise ValueError("loadMW must be 200 or 1000")
    df = load_martin_dataframe(
        load_mw=tier,
        martin_study=study,
        force_reload=True,
        generation=token,
    )
    source = badger_dataset_source(tier) if study == MARTIN_STUDY_BADGER else waco_dataset_source(tier)
    reset_datavis_mode()
    return {
        "ok": True,
        "load_mw": tier,
        "martin_study": study,
        "workbook": source.get("file"),
        "dataset_source": source,
        "sheet": source.get("sheet", "data"),
        "row_count": int(len(df)),
    }


async def _handle_waco_preload(
    load_mw: int | None,
    *,
    martin_study: str | None = None,
    state_id: object = None,
) -> dict:
    if _waco_tier_from_load_mw(load_mw) is None:
        raise HTTPException(status_code=400, detail="loadMW must be 200 or 1000")
    try:
        return await asyncio.to_thread(
            _preload_martin_workbook,
            load_mw,
            martin_study=martin_study,
            state_id=state_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/waco/preload")
async def configurator_waco_preload_get(loadMW: int = Query(...)):
    """Load Waco study workbook (query param fallback for touch / proxy clients)."""
    return await _handle_waco_preload(loadMW)


@router.post("/waco/preload")
async def configurator_waco_preload(
    body: WacoPreloadRequest | None = None,
    loadMW: int | None = Query(None),
):
    """Load Waco study workbook (200 MW or 1 GW) into backend cache (Martin / dataVis)."""
    payload = body or WacoPreloadRequest()
    tier_mw = payload.loadMW if payload.loadMW is not None else loadMW
    return await _handle_waco_preload(
        tier_mw,
        martin_study=payload.martinStudy,
    )


@router.get("/cluster/session")
async def configurator_cluster_session():
    """Current Ideum → wall display session (Maingear backend)."""
    return {"ok": True, "session": await get_configurator_session()}


@router.post("/cluster/submit")
async def configurator_cluster_submit(body: dict):
    """
    Ideum touch table submits inputs; Maingear runs the optimizer and broadcasts
    results to wall-display UI clients on /ws/cluster.

    On Ideum, this endpoint accepts the POST and forwards it to peerBackendUrl
    (Maingear). The browser can stay on same-origin /api/... and avoid CORS.
    """
    role = resolve_machine_role()
    if role.get("isMaingear"):
        return await _run_maingear_cluster_submit(body)

    peer_url = (role.get("peerBackendUrl") or "").strip()
    if peer_url:
        return await _forward_cluster_submit_to_peer(peer_url, body)

    raise HTTPException(
        status_code=403,
        detail="Configurator cluster submit requires Maingear or a configured peerBackendUrl.",
    )


async def _forward_cluster_close_to_peer(peer_base: str, body: dict) -> dict:
    url = f"{peer_base.rstrip('/')}/api/configurator/cluster/close"

    def _post() -> tuple[dict, int]:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8")), resp.status
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                detail = parsed.get("detail", raw)
            except json.JSONDecodeError:
                detail = raw or exc.reason
            return {"detail": detail}, exc.code
        except urllib.error.URLError as exc:
            return {"detail": f"Could not reach Maingear at {peer_base}: {exc.reason}"}, 502

    payload, status = await asyncio.to_thread(_post)
    if status >= 400:
        raise HTTPException(
            status_code=status,
            detail=payload.get("detail", f"Maingear cluster close failed ({status})"),
        )
    return payload


@router.post("/cluster/close")
async def configurator_cluster_close(body: dict | None = None):
    """Ideum navigation away from configurator — dismiss Maingear wall overlay."""
    role = resolve_machine_role()
    payload = body if isinstance(body, dict) else {}
    source = (payload.get("source") or "ideum").strip()

    async def broadcast(message: dict) -> int:
        return await cluster_manager.broadcast(message)

    if role.get("isMaingear"):
        session = await close_configurator_wall_cluster(source=source, broadcast=broadcast)
        return {"ok": True, "session": session}

    peer_url = (role.get("peerBackendUrl") or "").strip()
    if peer_url:
        return await _forward_cluster_close_to_peer(peer_url, {"source": source})

    raise HTTPException(
        status_code=403,
        detail="Configurator cluster close requires Maingear or a configured peerBackendUrl.",
    )


async def _forward_waco_preload_to_peer(
    peer_base: str,
    load_mw: int | None = None,
    *,
    martin_study: str | None = None,
    state_id: object = None,
) -> dict:
    url = f"{peer_base.rstrip('/')}/api/configurator/waco/preload"
    post_body: dict[str, object] = {}
    if load_mw is not None:
        post_body["loadMW"] = load_mw
    if martin_study in MARTIN_STUDIES:
        post_body["martinStudy"] = martin_study
    if state_id:
        post_body["stateId"] = state_id

    def _post() -> tuple[dict, int]:
        req = urllib.request.Request(
            url,
            data=json.dumps(post_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8")), resp.status
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                detail = parsed.get("detail", raw)
            except json.JSONDecodeError:
                detail = raw or exc.reason
            return {"detail": detail}, exc.code
        except urllib.error.URLError as exc:
            return {"detail": f"Could not reach Maingear at {peer_base}: {exc.reason}"}, 502

    payload, status = await asyncio.to_thread(_post)
    if status >= 400:
        raise HTTPException(
            status_code=status,
            detail=payload.get("detail", f"Maingear Waco preload failed ({status})"),
        )
    return payload


@router.post("/cluster/waco-preload")
async def configurator_cluster_waco_preload(body: dict | None = None):
    """
    Warm Waco study workbook on this machine; Ideum also forwards to Maingear peer when configured.
    """
    payload = body if isinstance(body, dict) else {}
    tier = _waco_tier_from_load_mw(payload.get("loadMW"))
    martin_study = payload.get("martinStudy")
    state_id = payload.get("stateId")
    role = resolve_machine_role()
    local = await asyncio.to_thread(
        _preload_martin_workbook,
        tier,
        martin_study=martin_study,
        state_id=state_id,
    )

    peer_url = (role.get("peerBackendUrl") or "").strip()
    if role.get("isIdeum") and peer_url and not role.get("combinedWallAndTouch"):
        try:
            peer = await _forward_waco_preload_to_peer(
                peer_url,
                tier,
                martin_study=martin_study if isinstance(martin_study, str) else None,
                state_id=state_id,
            )
            return {"ok": True, "local": local, "peer": peer, "forwarded": True}
        except HTTPException as exc:
            return {
                "ok": True,
                "local": local,
                "forwarded": False,
                "peerError": exc.detail,
                "hint": "Browser may POST waco/preload directly to peerBackendUrl.",
            }

    if role.get("isMaingear") or role.get("isDev"):
        return {"ok": True, "local": local, "forwarded": False}

    return {"ok": True, "local": local, "forwarded": False, "localOnly": True}


async def _forward_cluster_explore_sync_to_peer(peer_base: str, body: dict) -> dict:
    url = f"{peer_base.rstrip('/')}/api/configurator/cluster/explore-sync"

    def _post() -> tuple[dict, int]:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8")), resp.status
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw)
                detail = parsed.get("detail", raw)
            except json.JSONDecodeError:
                detail = raw or exc.reason
            return {"detail": detail}, exc.code
        except urllib.error.URLError as exc:
            return {"detail": f"Could not reach Maingear at {peer_base}: {exc.reason}"}, 502

    payload, status = await asyncio.to_thread(_post)
    if status >= 400:
        raise HTTPException(
            status_code=status,
            detail=payload.get("detail", f"Maingear explore-sync failed ({status})"),
        )
    return payload


async def _sync_waco_workbook_from_inputs(inputs: dict | None) -> dict | None:
    if not isinstance(inputs, dict):
        return None
    study = _resolve_martin_study(inputs.get("martinStudy"), inputs.get("stateId"))
    tier = _waco_tier_from_load_mw(inputs.get("loadMW"))
    if study != MARTIN_STUDY_BADGER and tier is None:
        return None
    return await asyncio.to_thread(
        _preload_martin_workbook,
        tier if tier is not None else 200,
        martin_study=study,
        state_id=inputs.get("stateId"),
    )


@router.post("/cluster/explore-sync")
async def configurator_cluster_explore_sync(body: dict):
    """
    Ideum Inputs sliders → Maingear Explore Data 4-up (parallel + wall panes).
    Broadcasts explore_data_sync on /ws/cluster; does not run the full wall submit pipeline.
    """
    inputs = body.get("inputs") if isinstance(body.get("inputs"), dict) else body
    waco_preload = None
    try:
        waco_preload = await _sync_waco_workbook_from_inputs(inputs if isinstance(inputs, dict) else None)
    except Exception as exc:  # noqa: BLE001 — do not fail corridor sync if workbook preload fails
        waco_preload = {"ok": False, "error": str(exc)}
    ui_mode = body.get("uiMode") or (inputs.get("uiMode") if isinstance(inputs, dict) else None) or "basic"
    ranges = body.get("ranges")
    if ranges is None and isinstance(inputs, dict):
        min_cfe = float(inputs.get("minCfePercent") or inputs.get("cfeTarget") or 0)
        max_cfe = float(inputs.get("maxCfePercent") or 100)
        rel = float(inputs.get("reliabilityTarget") or 99.99)
        min_solar = float(inputs.get("minSolarMW") or 0)
        max_solar = float(inputs.get("maxSolarMW") or 4000)
        min_wind = float(inputs.get("minWindMW") or 0)
        max_wind = float(inputs.get("maxWindMW") or 3000)
        cfe_lo = min(min_cfe, max_cfe) / 100.0
        cfe_hi = max(min_cfe, max_cfe) / 100.0
        ranges = {
            "Carbon Free Energy (%)": {"min": cfe_lo, "max": cfe_hi},
            "Annual Load Compliance (%)": {"min": rel, "max": 100},
            "Solar AC Nameplate (MWac)": {"min": min(min_solar, max_solar), "max": max(min_solar, max_solar)},
            "Wind Nameplate (MWac)": {"min": min(min_wind, max_wind), "max": max(min_wind, max_wind)},
        }

    message = {
        "type": "explore_data_sync",
        "inputs": inputs,
        "uiMode": ui_mode,
        "ranges": ranges,
        "source": (body.get("source") or "ideum").strip(),
        "at": body.get("at"),
    }

    remember_explore_data_sync(message)

    role = resolve_machine_role()
    if role.get("isMaingear"):
        delivered = await cluster_manager.broadcast(message)
        return {"ok": True, "deliveredToClients": delivered, "waco_preload": waco_preload}

    peer_url = (role.get("peerBackendUrl") or "").strip()
    # Ideum → Maingear only. Never forward on dev/unknown: peer defaults to 127.0.0.1:5000 and
    # deadlocks a single-worker uvicorn (request waits on HTTP to itself).
    if peer_url and role.get("isIdeum") and not role.get("combinedWallAndTouch"):
        try:
            return await _forward_cluster_explore_sync_to_peer(
                peer_url,
                {
                    "inputs": inputs,
                    "uiMode": ui_mode,
                    "ranges": ranges,
                    "source": message["source"],
                    "at": message.get("at"),
                },
            )
        except HTTPException as exc:
            return {
                "ok": False,
                "forwarded": False,
                "detail": exc.detail,
                "hint": "Use direct Maingear explore-sync from the Ideum browser (peerBackendUrl).",
            }

    delivered = await cluster_manager.broadcast(message)
    return {"ok": True, "deliveredToClients": delivered, "localOnly": True, "waco_preload": waco_preload}


@router.get("/cluster/explore-sync/latest")
async def configurator_cluster_explore_sync_latest():
    """Maingear Data Exploration / Explore Data — apply last corridor sync after open."""
    return {"ok": True, "sync": get_last_explore_data_sync()}
