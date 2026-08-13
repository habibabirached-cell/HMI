"""Data Center Configurator API routes (synthetic prototype)."""

from __future__ import annotations

from fastapi import APIRouter

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
