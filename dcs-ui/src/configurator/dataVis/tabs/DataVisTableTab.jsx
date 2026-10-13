import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisRows } from '../api/conf_dataVisApi';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import { allColumnsFromStats } from '../utils/dataVisFilters';

const ROW_ID_COL = 'dataVis_row_id';
const MAX_TABLE_COLUMNS = 15;
const PAGE_SIZE = 200;

const FALLBACK_VISIBLE_COLUMNS = [
  'Solar AC Nameplate (MWac)',
  'Wind Nameplate (MWac)',
  'BESS power Nameplate (MW)',
  '7HA Unit #',
  'LM2500 Unit #',
  'Project LCOE ($/MWh)',
  'Year 1 Load Compliance (%)',
  'Carbon Free Energy (%)',
];

function resolveInitialTableColumns(defaults, parallelDimensions) {
  const dims = parallelDimensions?.length
    ? parallelDimensions
    : defaults?.parallel_dimensions;
  if (Array.isArray(dims) && dims.length) {
    return dims.filter((c) => c !== ROW_ID_COL).slice(0, MAX_TABLE_COLUMNS);
  }
  return FALLBACK_VISIBLE_COLUMNS;
}

export default function DataVisTableTab({
  filters,
  columnStats,
  onSelectRowIds,
  compact = false,
  defaults = null,
  parallelDimensions = null,
}) {
  const allColumns = useMemo(() => allColumnsFromStats(columnStats), [columnStats]);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    resolveInitialTableColumns(defaults, parallelDimensions),
  );
  const [columnsCustomized, setColumnsCustomized] = useState(false);

  useEffect(() => {
    if (columnsCustomized) return;
    const next = resolveInitialTableColumns(defaults, parallelDimensions);
    setVisibleColumns(next);
  }, [columnsCustomized, defaults, parallelDimensions]);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('Project LCOE ($/MWh)');
  const [sortAsc, setSortAsc] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const requestColumns = useMemo(
    () => [ROW_ID_COL, ...visibleColumns.filter((c) => c !== ROW_ID_COL)],
    [visibleColumns],
  );

  useEffect(() => {
    let cancelled = false;
    postDataVisRows({
      filters,
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      columns: requestColumns,
      sort_column: sortCol,
      sort_asc: sortAsc,
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
  }, [filters, page, sortCol, sortAsc, requestColumns]);

  const toggleColumn = (col) => {
    if (col === ROW_ID_COL) return;
    setColumnsCustomized(true);
    setVisibleColumns((prev) => {
      if (prev.includes(col)) {
        const next = prev.filter((c) => c !== col);
        if (sortCol === col) {
          setSortCol(next[0] || ROW_ID_COL);
        }
        return next.length ? next : prev;
      }
      if (prev.length >= MAX_TABLE_COLUMNS) return prev;
      return [...prev, col];
    });
    setPage(0);
  };

  const removeColumn = (col) => {
    if (col === ROW_ID_COL) return;
    setColumnsCustomized(true);
    setVisibleColumns((prev) => {
      const next = prev.filter((c) => c !== col);
      if (!next.length) return prev;
      if (sortCol === col) {
        setSortCol(next[0] || ROW_ID_COL);
      }
      return next;
    });
    setPage(0);
  };

  const handleSortColumn = (column) => {
    setPage(0);
    if (column === sortCol) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortCol(column);
    setSortAsc(true);
  };

  if (error) return <p className="dataVis-error">{error}</p>;
  if (!data) return <p className="dataVis-muted">Loading table…</p>;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const displayCols = requestColumns;

  return (
    <div className={`dataVis-tabPanel${compact ? ' dataVis-tabPanel--compact' : ''}`}>
      <div className={`dataVis-toolbar dataVis-toolbar--tableHead${compact ? ' dataVis-toolbar--compact' : ''}`}>
        <DataVisColumnChipMenu
          columns={allColumns}
          mode="multi"
          selectedMulti={visibleColumns}
          maxSelected={MAX_TABLE_COLUMNS}
          buttonText="Choose table columns"
          menuHint={`Green = column shown (max ${MAX_TABLE_COLUMNS}). Row id is always included.`}
          onToggle={toggleColumn}
          isColumnVisible={(col) => col !== ROW_ID_COL}
        />
        <span className="dataVis-muted">Row column is always shown.</span>
      </div>
      <div className="dataVis-toolbar">
        <span className="dataVis-muted">
          Click header to sort · {sortAsc ? 'ascending' : 'descending'} · {PAGE_SIZE} rows per page
        </span>
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
      <div className="dataVis-tableWrap dataVis-tableWrap--wide dataVis-tableWrap--hug">
        <table className="dataVis-table dataVis-table--compact dataVis-table--hug">
          <thead>
            <tr>
              {displayCols.map((c) => {
                const active = c === sortCol;
                const label = c === ROW_ID_COL ? 'Row' : c;
                const canRemove = c !== ROW_ID_COL;
                return (
                  <th key={c}>
                    <div className="dataVis-thInner">
                      <button
                        type="button"
                        className={`dataVis-sortBtn${active ? ' dataVis-sortBtn--active' : ''}`}
                        onClick={() => handleSortColumn(c)}
                        aria-sort={active ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                      >
                        <span className="dataVis-sortBtn__label">{label}</span>
                        <span className="dataVis-sortBtn__icon" aria-hidden="true">
                          {active ? (sortAsc ? '▲' : '▼') : '⇅'}
                        </span>
                      </button>
                      {canRemove && (
                        <button
                          type="button"
                          className="dataVis-colRemove"
                          aria-label={`Remove column ${label}`}
                          onClick={() => removeColumn(c)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.dataVis_row_id}>
                {displayCols.map((c) => (
                  <td key={c} className={c === ROW_ID_COL ? 'dataVis-table__cell--id' : 'dataVis-table__cell--num'}>
                    {fmtCell(row[c], c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtCell(v, column) {
  if (v == null) return '—';
  if (typeof v === 'number') {
    const isPercent = column?.includes('(%)') || column?.includes('Compliance');
    const isUnitCount = column?.includes('Unit #');
    const maxFrac = isUnitCount ? 0 : isPercent ? 4 : 2;
    return Number(v).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    });
  }
  return String(v);
}
