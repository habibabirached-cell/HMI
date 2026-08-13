import React from 'react';
import { getTechnologyColor } from '../utils/conf_technologyColors';
import { formatMWExact } from '../utils/conf_formatters';

export default function ConfArchitectureFlow({ mix, loadMW }) {
  if (!mix?.length) return null;
  const topMix = mix.slice(0, 5);

  return (
    <section className="conf-arch-flow">
      <div className="conf-arch-flow__sources">
        {topMix.map((item) => (
          <div key={item.id} className="conf-arch-block" style={{ borderColor: getTechnologyColor(item.id) }}>
            <span className="conf-arch-block__title">{item.label}</span>
            <strong>
              {formatMWExact(item.installedMW)}
              {item.batteryMWh ? ` / ${Math.round(item.batteryMWh).toLocaleString()} MWh` : ''}
            </strong>
          </div>
        ))}
      </div>
      <div className="conf-arch-flow__connector" aria-hidden="true">
        <div className="conf-arch-flow__line" />
        <span className="conf-arch-flow__hub">Power System</span>
        <div className="conf-arch-flow__line" />
      </div>
      <div className="conf-arch-block conf-arch-block--load">
        <span className="conf-arch-block__title">Data Center</span>
        <strong>{formatMWExact(loadMW)} Peak Load</strong>
      </div>
    </section>
  );
}
