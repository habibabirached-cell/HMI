import React, { useEffect, useState } from 'react';
import { postDataVisCompare } from '../api/conf_dataVisApi';

export default function DataVisCompareTab({ selectedRowIds, onSelectedRowIds }) {
  const [input, setInput] = useState((selectedRowIds || []).join(', '));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedRowIds?.length) {
      setInput(selectedRowIds.join(', '));
    }
  }, [selectedRowIds]);

  const runCompare = async () => {
    setError(null);
    const ids = input
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    if (!ids.length) {
      setError('Enter one or more row ids.');
      return;
    }
    onSelectedRowIds?.(ids);
    try {
      const res = await postDataVisCompare(ids);
      setRows(res.rows || []);
    } catch (err) {
      setError(err.message);
      setRows(null);
    }
  };

  const keys = rows?.length
    ? Object.keys(rows[0]).filter((k) => k !== 'dataVis_row_id')
    : [];

  return (
    <div className="dataVis-tabPanel">
      <div className="dataVis-toolbar">
        <label className="dataVis-field dataVis-field--grow">
          <span className="dataVis-field__label">Row ids</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 12, 48, 103"
          />
        </label>
        <button type="button" className="dataVis-primaryBtn" onClick={runCompare}>
          Compare
        </button>
      </div>
      {error && <p className="dataVis-error">{error}</p>}
      {rows && (
        <div className="dataVis-tableWrap dataVis-tableWrap--wide">
          <table className="dataVis-table dataVis-table--compact">
            <thead>
              <tr>
                <th>Metric</th>
                {rows.map((r) => (
                  <th key={r.dataVis_row_id}>Row {r.dataVis_row_id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  {rows.map((r) => (
                    <td key={`${r.dataVis_row_id}-${key}`}>{fmt(r[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmt(v) {
  if (v == null) return '—';
  if (typeof v === 'number') return Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(v);
}
