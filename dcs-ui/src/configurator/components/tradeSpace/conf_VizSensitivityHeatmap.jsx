import React, { useMemo, useState } from 'react';
import { lcoeColor, MOCK_MIN_CFE } from '../../../configuratorData/conf_tradeSpaceMockData';

export default function ConfVizSensitivityHeatmap({ initialLoad, buildGrid }) {
  const [loadMW, setLoadMW] = useState(initialLoad);
  const grid = useMemo(() => buildGrid(loadMW), [buildGrid, loadMW]);

  return (
    <div className="conf-viz">
      <label className="conf-viz__slider-row">
        <span>Data center load</span>
        <input
          type="range"
          min={300}
          max={1800}
          step={50}
          value={loadMW}
          onChange={(e) => setLoadMW(Number(e.target.value))}
        />
        <strong>{loadMW} MW</strong>
      </label>
      <p className="conf-field__helper">Cell value = synthetic portfolio LCOE ($/MWh)</p>
      <div className="conf-heatmap-wrap">
        <table className="conf-heatmap">
          <thead>
            <tr>
              <th>Availability ↓ / Min CFE →</th>
              {MOCK_MIN_CFE.map((c) => (
                <th key={c}>{c}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.reliability}>
                <th>{row.reliability}%</th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.minCfe}
                    style={{ background: lcoeColor(cell.lcoe), color: cell.lcoe > 95 ? '#fff' : '#1f2933' }}
                    title={`${row.reliability}% avail, ≥${cell.minCfe}% CFE, ${loadMW} MW`}
                  >
                    ${cell.lcoe}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="conf-viz__legend">Higher availability and minimum CFE drive higher LCOE (warmer cells).</p>
    </div>
  );
}
