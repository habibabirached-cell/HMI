import React, { useEffect, useState } from 'react';
import { postDataVisDoeSummary } from '../api/conf_dataVisApi';

export default function DataVisDoeTab({ filters, compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    postDataVisDoeSummary(filters)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (error) return <p className="dataVis-error">{error}</p>;
  if (!data) return <p className="dataVis-muted">Loading DOE summary…</p>;

  return (
    <div className={`dataVis-tabPanel${compact ? ' dataVis-tabPanel--compact' : ''}`}>
      {!compact && (
        <p className="dataVis-muted">
          Design-of-experiments inputs across {data.filtered_count} filtered scenarios.
        </p>
      )}
      <div className="dataVis-tableWrap">
        <table className="dataVis-table">
          <thead>
            <tr>
              <th>Input</th>
              <th>Unique</th>
              <th>Min</th>
              <th>Max</th>
              <th>Sample values</th>
            </tr>
          </thead>
          <tbody>
            {(data.inputs || []).map((row) => (
              <tr key={row.column}>
                <td>{row.column}</td>
                <td>{row.unique_values}</td>
                <td>{fmt(row.min)}</td>
                <td>{fmt(row.max)}</td>
                <td>
                  {row.sample_values
                    ? row.sample_values.join(', ')
                    : '(continuous / many levels)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
