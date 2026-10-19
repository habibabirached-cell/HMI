"""Pydantic schemas for the Data Center Configurator prototype API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ConfiguratorInputs(BaseModel):
    loadMW: float = Field(ge=200, le=1800)
    stateId: str = "texas"
    cityId: str = "dallas_tx"
    reliabilityTarget: float = Field(ge=97, le=100)
    minCfePercent: float = Field(default=0, ge=0, le=100)
    maxCfePercent: float = Field(default=100, ge=0, le=100)
    minSolarMW: float = Field(default=0, ge=0, le=10000)
    maxSolarMW: float = Field(default=4000, ge=0, le=10000)
    minWindMW: float = Field(default=0, ge=0, le=10000)
    maxWindMW: float = Field(default=3000, ge=0, le=10000)
    cfeTarget: Optional[float] = Field(default=None, ge=0, le=100)
    gridConnectionMode: str = Field(default="grid-connected")
    technologies: list[str] = Field(min_length=1)
    uiMode: str = Field(default="basic")
    optimizationObjective: str = Field(default="lowestCost")
    technologyMinPercent: dict[str, float] = Field(default_factory=dict)
    technologyPreferences: dict[str, str] = Field(default_factory=dict)
    # Ideum installed-CAPEX and gas-price wheels. Scales 200 MW project LCOE.
    technologyCapex: Optional[dict] = None


class WacoPreloadRequest(BaseModel):
    loadMW: Optional[int] = None
    martinStudy: Optional[str] = None


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
