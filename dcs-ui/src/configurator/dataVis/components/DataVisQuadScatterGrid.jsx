import React, { useEffect, useMemo, useState } from 'react';
import { ScatterSlot } from '../tabs/DataVisChartLabTab';
import { numericColumnsFromStats } from '../utils/dataVisFilters';

const QUAD_SCATTER_DEFAULTS = [
  {
    x: 'Solar AC Nameplate (MWac)',
    y: 'Project LCOE ($/MWh)',
    color: 'Year 1 Load Compliance (%)',
  },
  {
    x: 'Carbon Free Energy (%)',
    y: 'Year 1 Load Compliance (%)',
    color: 'Project LCOE ($/MWh)',
  },
  {
    x: 'Project LCOE ($/MWh)',
    y: 'Year 1 Load Compliance (%)',
    color: 'Solar AC Nameplate (MWac)',
  },
  {
    x: 'Carbon Free Energy (%)',
    y: 'Project LCOE ($/MWh)',
    color: 'Year 1 Load Compliance (%)',
  },
];

function pickDefaultSlot(index, numericCols, metaDefaults) {
  const preset = QUAD_SCATTER_DEFAULTS[index];
  if (preset) {
    return {
      x: numericCols.includes(preset.x) ? preset.x : numericCols[0],
      y: numericCols.includes(preset.y) ? preset.y : numericCols[1] || numericCols[0],
      color: preset.color && numericCols.includes(preset.color) ? preset.color : '',
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
}) {
  const numericCols = useMemo(() => numericColumnsFromStats(columnStats), [columnStats]);
  const [slots, setSlots] = useState(() =>
    QUAD_SCATTER_DEFAULTS.map((_, i) => pickDefaultSlot(i, [], defaults)),
  );

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

  const patchSlot = (index, patch) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  return (
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
          compact
        />
      ))}
    </div>
  );
}
