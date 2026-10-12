import React, { useEffect, useState } from 'react';
import { postDataVisOverview } from '../api/conf_dataVisApi';
import DataVisPlot from '../components/DataVisPlot';

export default function DataVisOverviewTab({ filters, scenario, onFilteredCount }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    postDataVisOverview(filters)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          onFilteredCount?.(res.filtered_count);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, onFilteredCount]);

  if (error) return <p className="dataVis-error">{error}</p>;
  if (!data) return <p className="dataVis-muted">Loading overview…</p>;

  const kpis = data.kpis || {};
  const pareto = kpis.pareto_preview || [];

  const barData = [
    {
      type: 'bar',
      x: pareto.map((r) => `#${r.dataVis_row_id}`),
      y: pareto.map((r) => r['Project LCOE ($/MWh)']),
      marker: { color: '#3d9bdc' },
      name: 'Project LCOE',
    },
  ];

  return (
    <div className="dataVis-tabPanel">
      {scenario && (
        <p className="dataVis-scenario">
          {scenario.location} · {scenario.firm_load_mw} MW firm · {scenario.annual_load_gwh} GWh/yr
        </p>
      )}
      <div className="dataVis-kpiGrid">
        <KpiCard title="Project LCOE ($/MWh)" stats={kpis.project_lcoe} />
        <KpiCard title="Year 1 load compliance (%)" stats={kpis.load_compliance} />
        <KpiCard title="Carbon-free energy (%)" stats={kpis.cfe} />
        <div className="dataVis-kpiCard">
          <div className="dataVis-kpiCard__title">≥99% load compliance</div>
          <div className="dataVis-kpiCard__value">
            {kpis.pct_meeting_99_load != null ? `${kpis.pct_meeting_99_load.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>
      <div className="dataVis-chartBlock">
        <h3 className="dataVis-sectionTitle">Lowest project LCOE (preview)</h3>
        <DataVisPlot
          data={barData}
          layout={{
            title: { text: 'Best cases by project LCOE', font: { size: 14 } },
            xaxis: { title: 'Row id' },
            yaxis: { title: '$/MWh' },
            height: Math.max(320, Math.round(window.innerHeight * 0.38)),
          }}
        />
      </div>
    </div>
  );
}

function KpiCard({ title, stats }) {
  if (!stats) return null;
  return (
    <div className="dataVis-kpiCard">
      <div className="dataVis-kpiCard__title">{title}</div>
      <div className="dataVis-kpiCard__row">
        <span>Min</span>
        <strong>{fmt(stats.min)}</strong>
      </div>
      <div className="dataVis-kpiCard__row">
        <span>Median</span>
        <strong>{fmt(stats.median)}</strong>
      </div>
      <div className="dataVis-kpiCard__row">
        <span>Max</span>
        <strong>{fmt(stats.max)}</strong>
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return '—';
  if (Math.abs(v) >= 100) return v.toFixed(1);
  return v.toFixed(2);
}
