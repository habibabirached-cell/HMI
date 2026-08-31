"""Pydantic schemas for the Data Center Configurator prototype API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ConfiguratorInputs(BaseModel):
    loadMW: float = Field(ge=50, le=2000)
    stateId: str = "texas"
    cityId: str = "dallas_tx"
    reliabilityTarget: float = Field(ge=99, le=99.999)
    minCfePercent: float = Field(default=0, ge=0, le=100)
    cfeTarget: Optional[float] = Field(default=None, ge=0, le=100)
    gridConnectionMode: str = Field(default="grid-connected")
    technologies: list[str] = Field(min_length=1)
    uiMode: str = Field(default="basic")
    optimizationObjective: str = Field(default="lowestCost")
    technologyMinPercent: dict[str, float] = Field(default_factory=dict)


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
    gridConnectionMode: Optional[str] = None
    optimizationObjective: Optional[str] = None
    details: Optional[list] = None
