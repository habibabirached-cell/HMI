import { DATAVIS_CFE_COL } from './dataVisColumnDisplayLabel';

/** Waco workbook stores CFE as fraction 0–1; UI shows percent 0–100. */
export function isCfeFractionColumn(columnKey) {
  return columnKey === DATAVIS_CFE_COL;
}

export function cfeStoredToDisplayPercent(stored) {
  const n = Number(stored);
  if (!Number.isFinite(n)) return stored;
  return n * 100;
}

export function cfeDisplayPercentToStored(display) {
  const n = Number(display);
  if (!Number.isFinite(n)) return display;
  return n / 100;
}

export function normalizeCfePercentForDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 0 && n <= 1.0001) return n * 100;
  return n;
}

export function parcoordsValuesForDimension(columnKey, rawValues) {
  if (!isCfeFractionColumn(columnKey) || !Array.isArray(rawValues)) return rawValues;
  return rawValues.map((v) => cfeStoredToDisplayPercent(v));
}

export function parcoordsBandStoredToDisplay(columnKey, band) {
  if (!band || !isCfeFractionColumn(columnKey)) return band;
  return {
    min: band.min != null ? cfeStoredToDisplayPercent(band.min) : band.min,
    max: band.max != null ? cfeStoredToDisplayPercent(band.max) : band.max,
  };
}

export function parcoordsBandDisplayToStored(columnKey, band) {
  if (!band || !isCfeFractionColumn(columnKey)) return band;
  return {
    min: band.min != null ? cfeDisplayPercentToStored(band.min) : band.min,
    max: band.max != null ? cfeDisplayPercentToStored(band.max) : band.max,
  };
}

export function parcoordsConstraintsDisplayToStored(constraintsByColumn) {
  if (!constraintsByColumn) return constraintsByColumn;
  const out = { ...constraintsByColumn };
  Object.keys(out).forEach((col) => {
    out[col] = parcoordsBandDisplayToStored(col, out[col]);
  });
  return out;
}
