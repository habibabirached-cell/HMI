"""Data Center Configurator API routes (synthetic prototype)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from cluster_peer import cluster_manager, resolve_machine_role
from configurator.cluster_state import get_configurator_session, submit_configurator_cluster
from configurator.conf_engine import run_configurator_engine
from configurator.conf_schemas import ConfiguratorGenerateResponse, ConfiguratorInputs

router = APIRouter(prefix="/api/configurator", tags=["configurator"])


@router.get("/health")
async def configurator_health():
    return {"ok": True, "module": "configurator", "mode": "synthetic"}


@router.post("/generate", response_model=ConfiguratorGenerateResponse)
async def generate_configuration(body: ConfiguratorInputs):
    result = run_configurator_engine(body.model_dump())
    return ConfiguratorGenerateResponse(**result, source="backend")


@router.get("/cluster/session")
async def configurator_cluster_session():
    """Current Ideum → wall display session (Maingear backend)."""
    return {"ok": True, "session": await get_configurator_session()}


@router.post("/cluster/submit")
async def configurator_cluster_submit(body: dict):
    """
    Ideum touch table submits inputs; Maingear runs the optimizer and broadcasts
    results to wall-display UI clients on /ws/cluster.
    """
    role = resolve_machine_role()
    if not role.get("isMaingear"):
        raise HTTPException(
            status_code=403,
            detail="Configurator cluster submit is only accepted on the Maingear backend.",
        )

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
        run_engine=run_configurator_engine,
        broadcast=broadcast,
    )
    return {"ok": True, "session": session}
