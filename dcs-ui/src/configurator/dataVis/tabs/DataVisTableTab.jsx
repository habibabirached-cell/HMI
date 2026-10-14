import React, { useEffect, useMemo, useState } from 'react';
import { postDataVisRows } from '../api/conf_dataVisApi';
import DataVisColumnChipMenu from '../components/DataVisColumnChipMenu';
import { allColumnsFromStats } from '../utils/dataVisFilters';
import {
  formatDataVisCell,
  MAX_TABLE_COLUMNS,
  resolveInitialTableColumns,
  ROW_ID_COL,
  tableDisplayColumns,
} from '../utils/dataVisTableColumns';

const PAGE_SIZE = 200;

export default function DataVisTableTab({
  filters,
  columnStats,
  onSelectRowIds,
  onEraseRow,
  compact = false,
  defaults = null,
  parallelDimensions = null,
  visibleColumns: visibleColumnsProp = null,
  onVisibleColumnsChange = null,
  columnsCustomized: columnsCustomizedProp = null,
  onColumnsCustomizedChange = null,
}) {
  const allColumns = useMemo(() => allColumnsFromStats(columnStats), [columnStats]);
  const [visibleColumnsLocal, setVisibleColumnsLocal] = useState(() =>
    resolveInitialTableColumns(defaults, parallelDimensions),
  );
  const [columnsCustomizedLocal, setColumnsCustomizedLocal] = useState(false);
  const visibleColumns = visibleColumnsProp ?? visibleColumnsLocal;
  const columnsCustomized = columnsCustomizedProp ?? columnsCustomizedLocal;

  const setVisibleColumns = (updater) => {
    const next = typeof updater === 'function' ? updater(visibleColumns) : updater;
    if (onVisibleColumnsChange) onVisibleColumnsChange(next);
    else setVisibleColumnsLocal(next);
  };

  const setColumnsCustomized = (value) => {
    if (onColumnsCustomizedChange) onColumnsCustomizedChange(value);
    else setColumnsCustomizedLocal(value);
  };

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
    () => tableDisplayColumns(visibleColumns),
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
              {onEraseRow ? (
                <th className="dataVis-table__thErase" scope="col">
                  Erase
                </th>
              ) : null}
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
                {onEraseRow ? (
                  <td className="dataVis-table__cellErase">
                    <button
                      type="button"
                      className="dataVis-rowErase"
                      aria-label={`Erase row ${row.dataVis_row_id}`}
                      onClick={() => onEraseRow(row.dataVis_row_id)}
                    >
                      ×
                    </button>
                  </td>
                ) : null}
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
  return formatDataVisCell(v, column);
}
