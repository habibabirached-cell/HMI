import React, { useEffect, useState } from 'react';
import { postDataVisOverview, postDataVisRows } from '../api/conf_dataVisApi';
import DataVisPlot from '../components/DataVisPlot';

/** Lowest-LCOE bar chart — always this many when enough rows match filters. */
export const DATAVIS_OVERVIEW_LCOE_TOP_N = 150;

export default function DataVisOverviewTab({ filters, scenario, onFilteredCount }) {
  const [data, setData] = useState(null);
  const [lcoeRankRows, setLcoeRankRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      postDataVisOverview(filters),
      postDataVisRows({
        filters,
        offset: 0,
        limit: DATAVIS_OVERVIEW_LCOE_TOP_N,
        sort_column: 'Project LCOE ($/MWh)',
        sort_asc: true,
        columns: ['dataVis_row_id', 'Project LCOE ($/MWh)'],
      }),
    ])
      .then(([overview, rowsRes]) => {
        if (!cancelled) {
          setData(overview);
          setLcoeRankRows(rowsRes.rows || []);
          onFilteredCount?.(overview.filtered_count);
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
  const pareto = lcoeRankRows;
  const topN = DATAVIS_OVERVIEW_LCOE_TOP_N;

  const barData = [
    {
      type: 'bar',
      x: pareto.map((_, i) => i + 1),
      y: pareto.map((r) => r['Project LCOE ($/MWh)']),
      marker: { color: '#3d9bdc' },
      name: 'Project LCOE',
      customdata: pareto.map((r) => r.dataVis_row_id),
      hovertemplate:
        'Rank %{x} (lowest LCOE first)<br>LCOE: %{y:.2f} $/MWh<br>Spreadsheet row %{customdata}<extra></extra>',
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
        <h3 className="dataVis-sectionTitle">
          Lowest project LCOE — top {Math.min(pareto.length, topN)} of {topN} ranked cases
          {pareto.length < topN ? ' (fewer rows match filters)' : ''}
        </h3>
        <DataVisPlot
          data={barData}
          layout={{
            title: { text: 'Project LCOE sorted low → high', font: { size: 16 } },
            xaxis: {
              title: 'Rank (1 = lowest LCOE)',
              dtick: pareto.length > 60 ? 10 : 5,
            },
            yaxis: { title: 'Project LCOE ($/MWh)' },
            height: Math.max(320, Math.round(window.innerHeight * 0.38)),
          }}
        />
        <p className="dataVis-axisCaption">
          X-axis: rank after sorting filtered scenarios by project LCOE (cheapest on the left). Hover a bar for
          the spreadsheet row number.
        </p>
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
