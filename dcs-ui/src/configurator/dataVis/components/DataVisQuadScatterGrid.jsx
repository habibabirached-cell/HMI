import React, { useEffect, useMemo, useState } from 'react';
import {
  SCATTER_INTERACTION_EXPLORE,
  SCATTER_INTERACTION_FILTER,
  ScatterSlot,
} from '../tabs/DataVisChartLabTab';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

const DEFAULT_SCATTER_COLOR = 'Project LCOE ($/MWh)';

const QUAD_SCATTER_DEFAULTS = [
  {
    x: 'Solar AC Nameplate (MWac)',
    y: 'Project LCOE ($/MWh)',
    color: DEFAULT_SCATTER_COLOR,
  },
  {
    x: 'Carbon Free Energy (%)',
    y: 'Annual Load Compliance (%)',
    color: DEFAULT_SCATTER_COLOR,
  },
  {
    x: 'Annual Load Compliance (%)',
    y: 'Project LCOE ($/MWh)',
    color: DEFAULT_SCATTER_COLOR,
  },
  {
    x: 'Carbon Free Energy (%)',
    y: 'Project LCOE ($/MWh)',
    color: DEFAULT_SCATTER_COLOR,
  },
];

function pickDefaultSlot(index, numericCols, metaDefaults) {
  const preset = QUAD_SCATTER_DEFAULTS[index];
  if (preset) {
    return {
      x: numericCols.includes(preset.x) ? preset.x : numericCols[0],
      y: numericCols.includes(preset.y) ? preset.y : numericCols[1] || numericCols[0],
      color:
        numericCols.includes(DEFAULT_SCATTER_COLOR)
          ? DEFAULT_SCATTER_COLOR
          : preset.color && numericCols.includes(preset.color)
            ? preset.color
            : '',
    };
  }
  if (index === 0 && metaDefaults?.scatter) {
    const d = metaDefaults.scatter;
    return {
      x: numericCols.includes(d.x) ? d.x : numericCols[0],
      y: numericCols.includes(d.y) ? d.y : numericCols[1] || numericCols[0],
      color: d.color && numericCols.includes(d.color) ? d.color : '',
    };
  }
  return {
    x: numericCols[index % numericCols.length],
    y: numericCols[(index + 1) % numericCols.length],
    color: '',
  };
}

export default function DataVisQuadScatterGrid({
  plotContextFilters,
  highlightRowIds,
  onScatterRowIdsChange,
  columnStats,
  defaults,
  scatterActive = false,
  hoverColumns = null,
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [slots, setSlots] = useState(() =>
    QUAD_SCATTER_DEFAULTS.map((_, i) => pickDefaultSlot(i, [], defaults)),
  );
  const [interactionMode, setInteractionMode] = useState(SCATTER_INTERACTION_FILTER);
  const [zoomResetSeq, setZoomResetSeq] = useState(0);

  useEffect(() => {
    if (!numericCols.length) return;
    setSlots((prev) =>
      prev.map((slot, i) => {
        const next = pickDefaultSlot(i, numericCols, defaults);
        const x = numericCols.includes(slot.x) ? slot.x : next.x;
        const y = numericCols.includes(slot.y) ? slot.y : next.y;
        const color = slot.color && numericCols.includes(slot.color) ? slot.color : next.color;
        return { x, y, color };
      }),
    );
  }, [defaults, numericCols]);

  useEffect(() => {
    if (!scatterActive) {
      setInteractionMode(SCATTER_INTERACTION_FILTER);
    }
  }, [scatterActive]);

  const patchSlot = (index, patch) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const exploring = interactionMode === SCATTER_INTERACTION_EXPLORE;

  return (
    <div className="dataVis-quadScatterWrap">
      <div className="dataVis-scatterModeBar" role="toolbar" aria-label="2D plot interaction">
        <div className="dataVis-segmented" role="group" aria-label="Drag mode">
          <button
            type="button"
            className={`dataVis-segmented__btn${!exploring ? ' dataVis-segmented__btn--active' : ''}`}
            aria-pressed={!exploring}
            onClick={() => setInteractionMode(SCATTER_INTERACTION_FILTER)}
          >
            Filter
          </button>
          <button
            type="button"
            className={`dataVis-segmented__btn${exploring ? ' dataVis-segmented__btn--active' : ''}`}
            aria-pressed={exploring}
            onClick={() => setInteractionMode(SCATTER_INTERACTION_EXPLORE)}
          >
            Explore
          </button>
        </div>
        <span className="dataVis-scatterModeBar__hint">
          {exploring ? 'Drag to pan · scroll to zoom · double-click reset' : 'Drag a box to filter'}
        </span>
        {exploring ? (
          <button
            type="button"
            className="dataVis-quadSlot__clear"
            onClick={() => setZoomResetSeq((n) => n + 1)}
          >
            Reset zoom
          </button>
        ) : null}
      </div>
      <div className="dataVis-quadScatterGrid">
        {slots.map((slot, index) => (
          <ScatterSlot
            key={`quad-scatter-${index}`}
            slotLabel={`Plot ${index + 1}`}
            x={slot.x}
            y={slot.y}
            color={slot.color}
            onXChange={(v) => patchSlot(index, { x: v })}
            onYChange={(v) => patchSlot(index, { y: v })}
            onColorChange={(v) => patchSlot(index, { color: v })}
            numericCols={numericCols}
            plotContextFilters={plotContextFilters}
            highlightRowIds={highlightRowIds}
            onScatterRowIdsChange={onScatterRowIdsChange}
            columnStats={columnStats}
            compact
            interactionMode={interactionMode}
            zoomResetSeq={zoomResetSeq}
            hoverColumns={hoverColumns}
          />
        ))}
      </div>
    </div>
  );
}
