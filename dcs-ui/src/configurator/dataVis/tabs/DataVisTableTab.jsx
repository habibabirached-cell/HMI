import React, { useEffect, useState } from 'react';
import { postDataVisRows } from '../api/conf_dataVisApi';

const TABLE_COLUMNS = [
  'dataVis_row_id',
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
  '7HA Unit #',
  'LM2500 Unit #',
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Carbon Free Energy (%)',
];

export default function DataVisTableTab({ filters, onSelectRowIds }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('Project LCOE ($/MWh)');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const limit = 50;

  useEffect(() => {
    let cancelled = false;
    postDataVisRows({
      filters,
      offset: page * limit,
      limit,
      columns: TABLE_COLUMNS,
      sort_column: sortCol,
      sort_asc: true,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, sortCol]);

  if (error) return <p className="dataVis-error">{error}</p>;
  if (!data) return <p className="dataVis-muted">Loading table…</p>;

  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  return (
    <div className="dataVis-tabPanel">
      <div className="dataVis-toolbar">
        <label className="dataVis-field">
          <span className="dataVis-field__label">Sort by</span>
          <select value={sortCol} onChange={(e) => { setSortCol(e.target.value); setPage(0); }}>
            {TABLE_COLUMNS.filter((c) => c !== 'dataVis_row_id').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="dataVis-pager">
          <button type="button" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {page + 1} / {totalPages} ({data.total} rows)
          </span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
      <div className="dataVis-tableWrap dataVis-tableWrap--wide">
        <table className="dataVis-table dataVis-table--compact">
          <thead>
            <tr>
              {TABLE_COLUMNS.map((c) => (
                <th key={c}>{c === 'dataVis_row_id' ? 'Row' : c}</th>
              ))}
              <th>Compare</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.dataVis_row_id}>
                {TABLE_COLUMNS.map((c) => (
                  <td key={c}>{fmtCell(row[c])}</td>
                ))}
                <td>
                  <button
                    type="button"
                    className="dataVis-linkBtn"
                    onClick={() => onSelectRowIds?.([row.dataVis_row_id])}
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtCell(v) {
  if (v == null) return '—';
  if (typeof v === 'number') return Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 });
  return String(v);
}
