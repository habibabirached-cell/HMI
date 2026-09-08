import { ENSEMBLE_COLUMN_SEP, parseEnsembleQualifiedColumn, qualifyEnsembleColumn } from './simulationLazyApi';

/** Replace the scenario prefix on a qualified ensemble column label. */
export function replaceQualifiedSimPrefix(qualified, oldId, newId) {
  if (!qualified || typeof qualified !== 'string') return qualified;
  const parsed = parseEnsembleQualifiedColumn(qualified);
  if (parsed && parsed.simId === oldId) {
    return qualifyEnsembleColumn(newId, parsed.column);
  }
  return qualified;
}

/** Replace qualified scenario references inside a formula string. */
export function replaceFormulaQualifiedRefs(formula, oldId, newId) {
  if (!formula || typeof formula !== 'string') return formula;
  const oldPrefix = `${oldId}${ENSEMBLE_COLUMN_SEP}`;
  if (!formula.includes(oldPrefix)) return formula;
  const newPrefix = `${newId}${ENSEMBLE_COLUMN_SEP}`;
  return formula.split(oldPrefix).join(newPrefix);
}

function remapObjectTree(obj, oldId, newId) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => remapObjectTree(item, oldId, newId));
  }
  if (typeof obj !== 'object') return obj;

  const out = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if ((k === 'ensembleSimId' || k === 'ensemble_sim_id') && v === oldId) {
      out[k] = newId;
    } else if (
      (k === 'xColumn' ||
        k === 'yColumn' ||
        k === 'timeColumn' ||
        k === 'x_column' ||
        k === 'y_column') &&
      typeof v === 'string'
    ) {
      out[k] = replaceQualifiedSimPrefix(v, oldId, newId);
    } else if ((k === 'yColumns' || k === 'y_columns') && Array.isArray(v)) {
      out[k] = v.map((c) => replaceQualifiedSimPrefix(c, oldId, newId));
    } else if (k === 'formula' && typeof v === 'string') {
      out[k] = replaceFormulaQualifiedRefs(v, oldId, newId);
    } else if (k === 'memberSimulations' && Array.isArray(v)) {
      out[k] = v.map((m) => (m === oldId ? newId : m));
    } else if (typeof v === 'object') {
      out[k] = remapObjectTree(v, oldId, newId);
    }
  }
  return out;
}

export function remapOpenChartForSimRename(chart, oldId, newId) {
  return remapObjectTree(chart, oldId, newId);
}

export function remapCanvasComponentsForSimRename(components, oldId, newId) {
  return (components || []).map((c) => remapObjectTree(c, oldId, newId));
}

export function remapEnsembleColumnGroups(groups, oldId, newId) {
  return (groups || []).map((g) => (g.simId === oldId ? { ...g, simId: newId } : g));
}

export function remapEnsembleMemberData(data, oldId, newId) {
  if (!data || !Object.prototype.hasOwnProperty.call(data, oldId)) return data;
  const next = { ...data };
  next[newId] = next[oldId];
  delete next[oldId];
  return next;
}

export function remapSimulationMetadataForSimRename(meta, oldId, newId) {
  if (!meta) return meta;
  const next = { ...meta };
  if (Array.isArray(next.columns)) {
    next.columns = next.columns.map((c) => replaceQualifiedSimPrefix(c, oldId, newId));
  }
  if (Array.isArray(next.memberSimulations)) {
    next.memberSimulations = next.memberSimulations.map((m) => (m === oldId ? newId : m));
  }
  if (Array.isArray(next.derivedVariables)) {
    next.derivedVariables = next.derivedVariables.map((d) => ({
      ...d,
      formula: replaceFormulaQualifiedRefs(d.formula, oldId, newId),
    }));
  }
  return next;
}

export function remapVariableDrivenPresenceRules(rules, oldId, newId) {
  return (rules || []).map((r) => remapObjectTree(r, oldId, newId));
}

/** Safe scenario id for rename (matches backend validation). */
export function sanitizeRenameSimId(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  const safe = trimmed.replace(/[^\w-]/g, '');
  return /^[a-zA-Z0-9]/.test(safe) ? safe.slice(0, 120) : '';
}
