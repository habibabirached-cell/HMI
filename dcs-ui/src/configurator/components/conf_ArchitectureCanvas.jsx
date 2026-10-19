import React, { useEffect, useMemo, useRef, useState } from 'react';
import Bess3DViewer from '../../components/Canvas/Schematics/Bess3DViewer';
import GasTurbine3DViewer from '../../components/Canvas/Schematics/GasTurbine3DViewer';
import WindTurbine3DViewer from '../../components/Canvas/Schematics/WindTurbine3DViewer';
import Ideum05Nav3DViewer from '../../components/IdeumKiosk/Ideum05Nav3DViewer';
import { GRID_CONNECTION_MODES } from '../../configuratorData/conf_constants';
import { isStorageTechnology } from '../../configuratorData/conf_technologies';
import {
  ARCHITECTURE_BUS_INNER,
  ARCHITECTURE_BUS_OUTER,
  ARCHITECTURE_BUS_RING_RADIUS,
  ARCHITECTURE_CENTER,
  ARCHITECTURE_DC_CORE_RADIUS,
  ARCHITECTURE_TITLE_INNER,
  ARCHITECTURE_TITLE_OUTER,
  ARCHITECTURE_TITLE_RING_RADIUS,
  DATA_CENTER_MODEL_URL,
  fullCirclePath,
  fullDonutPath,
  getArchitectureModelSpec,
  hubCenterFromRect,
  hubRingRadiusPx,
  layoutAssetsAroundHub,
  sortArchitectureAssets,
} from '../utils/conf_architectureModels';
import { formatCyclesPerDay, formatMWExact, formatPercent } from '../utils/conf_formatters';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { useConf3d } from '../utils/conf_3dContext';

function useElementSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

function useHubWires(stageRef, hubRef, assets, layout) {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const stage = stageRef.current;
    const hub = hubRef.current;
    if (!stage || !hub) return undefined;

    const compute = () => {
      const sr = stage.getBoundingClientRect();
      const hr = hub.getBoundingClientRect();
      if (sr.width < 1 || sr.height < 1 || hr.width < 1) return;

      const hubCenter = hubCenterFromRect(hr);
      const ringR = hubRingRadiusPx(hr);

      setLines(
        assets.map((asset) => {
          const slot = layout[asset.id];
          if (!slot) return null;
          const ax = sr.left + (slot.left / 100) * sr.width;
          const ay = sr.top + (slot.top / 100) * sr.height;
          const angle = Math.atan2(ay - hubCenter.y, ax - hubCenter.x);
          const bx = hubCenter.x + ringR * Math.cos(angle);
          const by = hubCenter.y + ringR * Math.sin(angle);
          return {
            id: asset.id,
            x1: ax - sr.left,
            y1: ay - sr.top,
            x2: bx - sr.left,
            y2: by - sr.top,
            dashed: isStorageTechnology(asset.id),
          };
        }).filter(Boolean),
      );
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(stage);
    ro.observe(hub);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [assets, layout, stageRef, hubRef]);

  return lines;
}

function ArchitectureModelPreview({ spec }) {
  const { enable3d } = useConf3d();
  const hostRef = useRef(null);
  const size = useElementSize(hostRef);
  const ready = enable3d && size.w > 20 && size.h > 20;

  return (
    <div ref={hostRef} className="conf-arch-canvas__model">
      {!enable3d && <div className="conf-arch-canvas__model-placeholder" aria-hidden="true" />}
      {ready && spec.kind === 'bess' && (
        <Bess3DViewer width={size.w} height={size.h} modelUrl={spec.url} />
      )}
      {ready && spec.kind === 'turbine' && (
        <GasTurbine3DViewer
          width={size.w}
          height={size.h}
          modelUrl={spec.url}
          turntableOnly
          cameraDist={spec.cameraDist}
          neutralLighting={spec.neutralLight}
        />
      )}
      {ready && spec.kind === 'wind' && (
        <WindTurbine3DViewer width={size.w} height={size.h} modelUrl={spec.url} />
      )}
      {ready && spec.kind === 'gltf' && (
        <Ideum05Nav3DViewer
          width={size.w}
          height={size.h}
          modelUrl={spec.url}
          fitScale={spec.fitScale ?? 0.88}
          modelYOffset={spec.modelYOffset ?? -0.04}
          cameraPitchLift={spec.cameraPitchLift ?? 0.38}
        />
      )}
      {!ready && <div className="conf-arch-canvas__model-placeholder" aria-hidden="true" />}
    </div>
  );
}

function compactMW(mw, decimals = 0) {
  const n = Number(mw);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}MW`;
}

function capacityFactorForAsset(capacityFactors, assetId) {
  return (capacityFactors || []).find((row) => row.id === assetId) ?? null;
}

function formatUnitCountSuffix(asset) {
  const n = Number(asset.unitCount);
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n);
  return ` · ${rounded} unit${rounded === 1 ? '' : 's'}`;
}

function formatAssetCapacityLine(asset) {
  const share = asset.capacitySharePercent ?? asset.percent ?? 0;
  const mwText = compactMW(asset.installedMW);
  const shareText = formatPercent(share, 2);
  const unitsText = formatUnitCountSuffix(asset);
  if (asset.batteryMWh) {
    const mwhText = Math.round(asset.batteryMWh).toLocaleString();
    return `capacity: ${mwText} (${shareText})${unitsText} / ${mwhText} MWh`;
  }
  return `capacity: ${mwText} (${shareText})${unitsText}`;
}

function formatAssetUtilizationLine(asset, cfRow) {
  if (!cfRow) return 'Utilization: —';

  if (cfRow.utilization != null) {
    return `Utilization: ${formatCyclesPerDay(cfRow.utilization)}`;
  }

  if (cfRow.capacityFactor != null) {
    const utilMw = asset.installedMW * cfRow.capacityFactor;
    return `Utilization: ${compactMW(utilMw)} (${formatPercent(cfRow.capacityFactor * 100, 0)})`;
  }

  return 'Utilization: —';
}

function ArchitectureAssetCard({ asset, slot, capacityFactors }) {
  const spec = getArchitectureModelSpec(asset.id);
  const isStorage = isStorageTechnology(asset.id);
  const title = asset.fullLabel || asset.label;
  const cfRow = capacityFactorForAsset(capacityFactors, asset.id);

  return (
    <article
      className={`conf-arch-canvas__asset${isStorage ? ' conf-arch-canvas__asset--storage' : ''}`}
      style={{
        left: `${slot.left}%`,
        top: `${slot.top}%`,
        borderColor: getTechnologyColor(asset.id),
        transform: 'translate(-50%, -50%)',
      }}
    >
      <header className="conf-arch-canvas__asset-head">
        <span className="conf-arch-canvas__asset-title">{title}</span>
        <span className="conf-arch-canvas__asset-capacity">{formatAssetCapacityLine(asset)}</span>
      </header>
      <ArchitectureModelPreview spec={spec} />
      <footer className="conf-arch-canvas__asset-foot">
        {formatAssetUtilizationLine(asset, cfRow)}
      </footer>
    </article>
  );
}

function ArchitectureCore({ loadMW }) {
  const dcSpec = {
    kind: 'gltf',
    url: DATA_CENTER_MODEL_URL,
    fitScale: 0.9,
    modelYOffset: -0.04,
  };

  return (
    <div className="conf-arch-canvas__core" aria-label="Data center and AC bus distribution network">
      <svg
        className="conf-arch-canvas__rings-svg"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <defs>
          <path
            id="conf-arch-dc-title-path"
            d={fullCirclePath(ARCHITECTURE_TITLE_RING_RADIUS)}
          />
          <path
            id="conf-arch-bus-title-path"
            d={fullCirclePath(ARCHITECTURE_BUS_RING_RADIUS)}
          />
        </defs>

        <path
          d={fullDonutPath(ARCHITECTURE_BUS_OUTER, ARCHITECTURE_BUS_INNER)}
          className="conf-arch-canvas__ring-band conf-arch-canvas__ring-band--bus"
          fillRule="evenodd"
        />
        <path
          d={fullDonutPath(ARCHITECTURE_TITLE_OUTER, ARCHITECTURE_TITLE_INNER)}
          className="conf-arch-canvas__ring-band conf-arch-canvas__ring-band--title"
          fillRule="evenodd"
        />

        <circle
          cx={ARCHITECTURE_CENTER.x}
          cy={ARCHITECTURE_CENTER.y}
          r={ARCHITECTURE_BUS_OUTER}
          className="conf-arch-canvas__ring-stroke conf-arch-canvas__ring-stroke--bus"
        />
        <circle
          cx={ARCHITECTURE_CENTER.x}
          cy={ARCHITECTURE_CENTER.y}
          r={ARCHITECTURE_TITLE_OUTER}
          className="conf-arch-canvas__ring-stroke conf-arch-canvas__ring-stroke--title"
        />

        <text className="conf-arch-canvas__ring-text conf-arch-canvas__ring-text--bus">
          <textPath href="#conf-arch-bus-title-path" startOffset="25%" textAnchor="middle">
            AC Bus / Distribution Network
          </textPath>
        </text>
        <text className="conf-arch-canvas__ring-text conf-arch-canvas__ring-text--dc">
          <textPath href="#conf-arch-dc-title-path" startOffset="25%" textAnchor="middle">
            {`Data Center · ${formatMWExact(loadMW)} peak`}
          </textPath>
        </text>
      </svg>

      <div
        className="conf-arch-canvas__dc-core"
        style={{
          width: `${ARCHITECTURE_DC_CORE_RADIUS * 2}%`,
          height: `${ARCHITECTURE_DC_CORE_RADIUS * 2}%`,
          left: `${ARCHITECTURE_CENTER.x}%`,
          top: `${ARCHITECTURE_CENTER.y}%`,
        }}
      >
        <ArchitectureModelPreview spec={dcSpec} />
      </div>
    </div>
  );
}

function HvWire({ line }) {
  return (
    <g className={`conf-arch-canvas__wire-group${line.dashed ? ' conf-arch-canvas__wire-group--dashed' : ''}`}>
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        className="conf-arch-canvas__wire conf-arch-canvas__wire--shadow"
      />
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        className="conf-arch-canvas__wire conf-arch-canvas__wire--sheath"
      />
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        className="conf-arch-canvas__wire conf-arch-canvas__wire--conductor"
      />
    </g>
  );
}

export default function ConfArchitectureCanvas({
  supplyMix,
  capacityFactors,
  loadMW,
  gridConnectionMode,
  variant = 'wall',
}) {
  const stageRef = useRef(null);
  const hubRef = useRef(null);
  const stageSize = useElementSize(stageRef);

  const assets = useMemo(
    () => sortArchitectureAssets(
      (supplyMix || []).filter((row) => Number(row.installedMW) > 0),
    ),
    [supplyMix],
  );

  const layout = useMemo(() => {
    const slots = layoutAssetsAroundHub(assets.length);
    const slotById = {};
    assets.forEach((asset, index) => {
      slotById[asset.id] = slots[index];
    });
    return slotById;
  }, [assets]);

  const connections = useHubWires(stageRef, hubRef, assets, layout);
  const isGrid = gridConnectionMode !== GRID_CONNECTION_MODES.ISLANDED;

  return (
    <section className={`conf-arch-canvas conf-arch-canvas--${variant}`} data-screen-region="sld">
      <div className="conf-arch-canvas__stage" ref={stageRef}>
        {stageSize.w > 0 && stageSize.h > 0 && (
          <svg
            className="conf-arch-canvas__wiring"
            width={stageSize.w}
            height={stageSize.h}
            viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
            aria-hidden="true"
          >
            {connections.map((line) => (
              <HvWire key={line.id} line={line} />
            ))}
          </svg>
        )}

        {isGrid && (
          <div className="conf-arch-canvas__grid-badge" aria-label="Utility grid connection">
            Utility Grid
          </div>
        )}

        <div className="conf-arch-canvas__hub-layer" ref={hubRef}>
          <ArchitectureCore loadMW={loadMW} />
        </div>

        {assets.map((asset) => (
          <ArchitectureAssetCard
            key={asset.id}
            asset={asset}
            slot={layout[asset.id]}
            capacityFactors={capacityFactors}
          />
        ))}
      </div>
    </section>
  );
}
