import React, { useMemo, useState } from 'react';
import '../SimulationChartBuilder/SimulationChartBuilder.css';
import './ChartVariablePickerDialog.css';
import { qualifyEnsembleColumn } from '../../utils/simulationLazyApi';

function matchesFilter(text, filter) {
  if (!filter) return true;
  return String(text || '').toLowerCase().includes(filter);
}

/**
 * Modal column picker for the chart label editor — mirrors SimulationChartBuilder’s
 * ensemble column list (grouped by member scenario) or a flat list for single scenarios.
 */
const ChartVariablePickerDialog = ({
  title = 'Choose variable',
  role = 'x',
  currentColumn = '',
  isEnsemble = false,
  ensembleColumnGroups = [],
  columns = [],
  derivedVariables = [],
  onSelect,
  onClose,
}) => {
  const [filterText, setFilterText] = useState('');
  const filter = filterText.trim().toLowerCase();

  const primarySimForFormula = ensembleColumnGroups?.[0]?.simId;
  const useEnsembleLayout = isEnsemble && ensembleColumnGroups.length > 0;

  const filteredEnsembleGroups = useMemo(() => {
    if (!useEnsembleLayout) return [];
    return ensembleColumnGroups
      .map((g) => {
        const scenarioMatch = matchesFilter(g.simId, filter);
        const cols = (g.columns || []).filter(
          (rawCol) => scenarioMatch || matchesFilter(rawCol, filter),
        );
        if (!filter) return { ...g, columns: g.columns || [] };
        if (scenarioMatch) return { ...g, columns: g.columns || [] };
        if (cols.length) return { ...g, columns: cols };
        return null;
      })
      .filter(Boolean);
  }, [useEnsembleLayout, ensembleColumnGroups, filter]);

  const showFormulaGroup = useMemo(() => {
    if (!derivedVariables?.length || !primarySimForFormula) return false;
    if (!filter) return true;
    if (matchesFilter('ƒ (live)', filter) || matchesFilter('formula', filter) || matchesFilter('live', filter)) {
      return true;
    }
    return derivedVariables.some((d) => matchesFilter(d.name, filter));
  }, [derivedVariables, primarySimForFormula, filter]);

  const filteredDerivedVariables = useMemo(() => {
    if (!derivedVariables?.length) return [];
    if (!filter) return derivedVariables;
    const formulaHeaderMatch =
      matchesFilter('ƒ (live)', filter) || matchesFilter('formula', filter) || matchesFilter('live', filter);
    return derivedVariables.filter((d) => formulaHeaderMatch || matchesFilter(d.name, filter));
  }, [derivedVariables, filter]);

  const filteredFlatColumns = useMemo(() => {
    const all = [
      ...columns.map((col) => ({ key: col, label: col, qualified: col, formula: null })),
      ...(derivedVariables || []).map((d) => ({
        key: `derived-${d.name}`,
        label: d.name,
        qualified: d.name,
        formula: d.formula,
        derived: true,
      })),
    ];
    if (!filter) return all;
    return all.filter((item) => matchesFilter(item.label, filter));
  }, [columns, derivedVariables, filter]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('chart-var-picker-overlay')) onClose?.();
  };

  const handlePick = (qualified) => {
    onSelect?.(qualified);
    onClose?.();
  };

  const isCurrent = (qualified) => {
    if (!currentColumn || !qualified) return false;
    return qualified === currentColumn;
  };

  const roleHint =
    role === 'x'
      ? 'Pick the X-axis variable'
      : role === 'add-y'
        ? 'Pick a variable to add to the chart'
        : 'Pick a variable to replace the selected trace';

  const hasResults = useEnsembleLayout
    ? filteredEnsembleGroups.length > 0 || showFormulaGroup
    : filteredFlatColumns.length > 0;

  return (
    <div className="chart-var-picker-overlay dialog-overlay" onClick={handleOverlayClick}>
      <div className="chart-var-picker-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="chart-var-picker-header">
          <h3>{title}</h3>
          <button type="button" className="chart-var-picker-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="chart-var-picker-hint">{roleHint}</p>
        <div className="chart-var-picker-filter-row">
          <input
            type="search"
            className="chart-var-picker-filter"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by scenario or variable name…"
            autoFocus
          />
          {filterText ? (
            <button
              type="button"
              className="chart-var-picker-filter-clear"
              onClick={() => setFilterText('')}
              aria-label="Clear filter"
              title="Clear filter"
            >
              ✕
            </button>
          ) : null}
        </div>
        <div className="chart-var-picker-body sim-chart-builder-list sim-chart-builder-list--ensemble">
          <div className="sim-chart-builder-col-header-row">
            <h4 className="chart-var-picker-columns-title">Columns</h4>
          </div>
          {!hasResults ? (
            <p className="chart-var-picker-empty">No scenarios or variables match &ldquo;{filterText}&rdquo;</p>
          ) : useEnsembleLayout ? (
            <>
              <div className="sim-chart-builder-ensemble-banner-title">Variables (ensemble)</div>
              <p className="sim-chart-builder-ensemble-hint">
                Columns from all member scenarios. Change variables here — same behavior as a simple scenario.
              </p>
              {filteredEnsembleGroups.map((g) => (
                <div key={g.simId} className="sim-chart-builder-ensemble-group">
                  <div className="sim-chart-builder-ensemble-group-label">{g.simId}</div>
                  <div className="sim-chart-builder-ensemble-group-items">
                    {(g.columns || []).map((rawCol) => {
                      const qualified = qualifyEnsembleColumn(g.simId, rawCol);
                      const selected = isCurrent(qualified);
                      return (
                        <button
                          key={`${g.simId}-${rawCol}`}
                          type="button"
                          className={`sim-chart-builder-item sim-chart-builder-item--ensemble chart-var-picker-item${selected ? ' selected' : ''}`}
                          onClick={() => handlePick(qualified)}
                          title={qualified}
                        >
                          <span className="sim-chart-builder-ensemble-item-main">
                            {selected ? `${rawCol} ✓` : rawCol}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {showFormulaGroup && (
                <div className="sim-chart-builder-ensemble-group sim-chart-builder-ensemble-group--formula">
                  <div
                    className="sim-chart-builder-ensemble-group-label"
                    title="Evaluated in the browser from member columns"
                  >
                    ƒ (live)
                  </div>
                  <div className="sim-chart-builder-ensemble-group-items">
                    {filteredDerivedVariables.map((d) => {
                      const qualified = qualifyEnsembleColumn(primarySimForFormula, d.name);
                      const selected = isCurrent(qualified);
                      return (
                        <button
                          key={`formula-${d.name}`}
                          type="button"
                          className={`sim-chart-builder-item sim-chart-builder-item--ensemble chart-var-picker-item sim-chart-builder-item-derived${selected ? ' selected' : ''}`}
                          onClick={() => handlePick(qualified)}
                          title={d.formula}
                        >
                          {selected ? `${d.name} ✓` : d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="chart-var-picker-flat-list">
              {filteredFlatColumns.map((item) => {
                const selected = isCurrent(item.qualified);
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`sim-chart-builder-item chart-var-picker-item${item.derived ? ' sim-chart-builder-item-derived' : ''}${selected ? ' selected' : ''}`}
                    onClick={() => handlePick(item.qualified)}
                    title={item.formula || item.qualified}
                  >
                    {selected ? `${item.label} ✓` : item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartVariablePickerDialog;
