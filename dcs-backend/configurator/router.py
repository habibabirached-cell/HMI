"""Data Center Configurator API routes (synthetic prototype)."""

from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException

from cluster_peer import cluster_manager, resolve_machine_role
from configurator.cluster_state import get_configurator_session, submit_configurator_cluster
from configurator.conf_consolidated import generate_configurator_result
from configurator.conf_schemas import ConfiguratorGenerateResponse, ConfiguratorInputs

router = APIRouter(prefix="/api/configurator", tags=["configurator"])


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
    payload = {k: v for k, v in body.items() if k != "source"}
    try:
        inputs = ConfiguratorInputs(**payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    inputs_dict = inputs.model_dump()

    async def broadcast(message: dict) -> int:
        return await cluster_manager.broadcast(message)

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
async def generate_configuration(body: ConfiguratorInputs):
    result = generate_configurator_result(body.model_dump())
    return ConfiguratorGenerateResponse(**result, source=result.get("source", "backend"))


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
