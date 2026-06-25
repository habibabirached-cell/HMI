/** On-disk scenario id for materialized ensemble formulas (unchanged). */
export const FORMULA_PARQUET_SCENARIO_ID = 'formula';

/**
 * User-facing label for Parquet-materialized formula columns.
 * Indicates values are etched in Parquet and treated like any other variable.
 */
export const FORMULA_PARQUET_DISPLAY_NAME = 'FormulaTattooedInParquet';

export function isFormulaParquetScenarioId(simId) {
  return simId === FORMULA_PARQUET_SCENARIO_ID;
}

/** @returns {string|null} display label when simId is the formula Parquet member */
export function formatFormulaParquetScenarioLabel(simId) {
  return isFormulaParquetScenarioId(simId) ? FORMULA_PARQUET_DISPLAY_NAME : null;
}
