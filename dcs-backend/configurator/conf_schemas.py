"""Pydantic schemas for the Data Center Configurator prototype API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ConfiguratorInputs(BaseModel):
    loadMW: float = Field(ge=50, le=2000)
    stateId: str
    cityId: str
    reliabilityTarget: float = Field(ge=99.9, le=99.999)
    cfeTarget: float = Field(ge=0, le=100)
    technologies: list[str] = Field(min_length=1)


class ConfiguratorGenerateResponse(BaseModel):
    ok: bool
    synthetic: bool = True
    source: str = "backend"
    error: Optional[str] = None
    summary: Optional[str] = None
    totalInstalledMW: Optional[float] = None
    inputs: Optional[dict] = None
    location: Optional[dict] = None
    kpis: Optional[dict] = None
    supplyMix: Optional[list] = None
    capacityFactors: Optional[list] = None
    curtailment: Optional[dict] = None
    annualGenerationGWh: Optional[float] = None
    targets: Optional[dict] = None
    seed: Optional[int] = None
