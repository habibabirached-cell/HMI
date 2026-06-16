/**
 * Quick Scenarios UI: built-in failure actions + user shortcuts to named chart presets.
 */

export const DEFAULT_QUICK_SCENARIOS = [
  {
    id: 'trip-random-turbine',
    label: 'Trip Random Turbine',
    icon: '🎲',
    variant: 'danger',
    action: 'tripRandom',
  },
  {
    id: 'trip-all-turbines',
    label: 'Trip All Turbines',
    icon: '💥',
    variant: 'danger',
    action: 'tripAll',
  },
  {
    id: 'grid-loss',
    label: 'Grid Loss',
    icon: '⚡',
    variant: 'danger',
    action: 'gridLoss',
  },
  {
    id: 'open-all-breakers',
    label: 'Open All Breakers',
    icon: '🔌',
    variant: 'warning',
    action: 'openAll',
  },
];

/** Normalize #rgb / #rrggbb for swatches and native color input. */
export function normalizeButtonColor(raw, fallback = '#e65100') {
  if (typeof raw !== 'string') return fallback;
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

/** Background colors for custom shortcut buttons (preset swatches). */
export const QUICK_SCENARIO_COLOR_OPTIONS = [
  { id: 'danger', label: 'Red', value: '#c62828' },
  { id: 'warning', label: 'Orange', value: '#e65100' },
  { id: 'amber', label: 'Amber', value: '#f57c00' },
  { id: 'teal', label: 'Teal', value: '#00695c' },
  { id: 'blue', label: 'Blue', value: '#1565c0' },
  { id: 'purple', label: 'Purple', value: '#6a1b9a' },
  { id: 'slate', label: 'Slate', value: '#455a64' },
  { id: 'green', label: 'Green', value: '#2e7d32' },
];

/**
 * Matched greens for statcom05 lower-plant quick scenarios (Material Green / Teal ramp).
 * Full combo = deepest green; BESS = teal; STATCOM = mid green — distinct but cohesive.
 */
export const QUICK_SCENARIO_LOWER_PLANT_COLORS = {
  withBessandStatCom: '#2e7d32',
  withBessAlone: '#00695c',
  withStatcomAlone: '#388e3c',
};

/**
 * Icons for “Save scenario as” — data-center / power / IT operations themed (~120).
 * Deduped; order puts common controls first, then thematic groups.
 */
const _QUICK_SCENARIO_ICON_RAW = [
  /* Controls & status */
  '🎲', '💥', '⚡', '🔌', '📊', '🔥', '⚠️', '🛑', '▶️', '⏸️', '⏹️', '⏺️', '🔋', '🏭', '🌐', '📈', '📉', '✅', '❌', '🔧',
  '💡', '🎯', '🚨', '🔔', '📣', '🔄', '⚙️', '🛠️', '🔩', '🔗', '⛓️', '🎛️', '🕹️', '⏱️', '⏰', '⏲️', '🕐',
  /* Power, grid, generation */
  '🌩️', '☀️', '🌪️', '🌬️', '♻️', '🛢️', '⛽', '🔆', '🔦', '🕯️', '💫', '✨', '🌊', '🏔️', '⛰️', '🗼', '🗽', '🚩', '🏁',
  '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🚫', '⛔', '📛',
  /* Electrical / breakers / buses */
  '🔘', '⭕', '🔲', '🔳', '◼️', '◻️', '🔶', '🔷', '🔸', '🔹', '📐', '📏', '🧲', '🔋', '🪫',
  /* Compute, data, networking */
  '🖥️', '💻', '⌨️', '🖱️', '💾', '📀', '🗄️', '🗂️', '📁', '📂', '🗃️', '🧮', '📟', '📠', '📡', '🛰️', '📶', '📞', '📱',
  '☁️', '⛅', '🌤️', '🌍', '🗺️', '🖧', '🔗', '📎', '📌', '📍',
  /* Cooling, environment, facility */
  '❄️', '🧊', '💧', '🌡️', '💨', '🚿', '🏢', '🏗️', '🏬', '🏛️', '🏘️', '🚪', '🪟', '🧱', '🪜', '🛗',
  /* Storage, BESS, UPS, racks */
  '📦', '🚚', '🚛', '🏪', '🔐', '🔒', '🔑', '🛡️', '🦺', '🥽', '🪖',
  /* Safety & incidents */
  '🧯', '🚒', '💣', '☢️', '⚗️', '🧪', '🔬', '🩺', '💊', '🆘', '🆕', '🆙', '🔼', '🔽', '⏫', '⏬',
  /* Monitoring & ops */
  '📋', '📝', '✏️', '🖊️', '🔍', '🔎', '📢', '📯', '🎚️', '👷', '👨‍💻', '👥', '🧑‍🔧', '🧑‍💼', '📹', '📷', '🎥',
  /* Charts, SLA, finance */
  '💰', '💵', '💳', '📊', '📈', '📉', '🎯', '⭐', '🌟', '💎', '🏆', '🥇', '🥈', '🥉',
  /* Misc operations */
  '🔁', '🔂', '↩️', '↪️', '⬆️', '⬇️', '⬅️', '➡️', '↔️', '↕️', '🔀', '🔃', '🌀', '💠', '🔱', '⚜️', '〽️', '©️', '®️',
  '™️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🎰', '🧩', '🧿', '🪬', '🪩', '🛰️', '🛸', '🚁', '✈️',
];

export const QUICK_SCENARIO_ICON_OPTIONS = [...new Set(_QUICK_SCENARIO_ICON_RAW)];

export function normalizeQuickScenarioButtons(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const label = String(item.label || item.name || '').trim();
    const presetName = String(item.presetName || '').trim();
    if (!label || !presetName) continue;
    const targetType = item.targetType === 'ensemble' ? 'ensemble' : 'simulation';
    const simulationId =
      targetType === 'simulation' ? String(item.simulationId || '').trim() : '';
    const ensembleId =
      targetType === 'ensemble' ? String(item.ensembleId || '').trim() : '';
    if (targetType === 'simulation' && !simulationId) continue;
    if (targetType === 'ensemble' && !ensembleId) continue;
    const color = normalizeButtonColor(
      item.color,
      QUICK_SCENARIO_COLOR_OPTIONS[1].value,
    );
    const icon =
      typeof item.icon === 'string' && item.icon.trim()
        ? item.icon.trim()
        : QUICK_SCENARIO_ICON_OPTIONS[0];
    out.push({
      id: String(item.id || `qs-${Date.now()}-${out.length}`),
      label,
      icon,
      color,
      presetName,
      targetType,
      simulationId: targetType === 'simulation' ? simulationId : undefined,
      ensembleId: targetType === 'ensemble' ? ensembleId : undefined,
    });
  }
  return out;
}

export function normalizeHiddenDefaultQuickScenarios(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(DEFAULT_QUICK_SCENARIOS.map((d) => d.id));
  return [...new Set(raw.map((id) => String(id).trim()).filter((id) => valid.has(id)))];
}

/** Design shortcuts rendered under Controls instead of Quick Scenarios. */
export const QUICK_SCENARIO_CONTROLS_PRESETS = new Set(['TurnOffAllPower']);

/** Named presets that only adjust canvas view for now (no simulation config yet). */
export const QUICK_SCENARIO_PLACEHOLDER_PRESETS = new Set([
  'withBessAlone',
  'withStatcomAlone',
]);

/**
 * First click = canvas design only (section visibility + collapse); second click = charts + simulation.
 * Used for statcom05 “No Bess No Statcom”.
 */
export const QUICK_SCENARIO_DESIGN_FIRST_PRESETS = new Set(['noBessNoStatcom']);

export function isQuickScenarioControlsShortcut(shortcut) {
  return (
    shortcut?.presetName != null &&
    QUICK_SCENARIO_CONTROLS_PRESETS.has(shortcut.presetName)
  );
}

export function isQuickScenarioPlaceholderPreset(presetName) {
  return QUICK_SCENARIO_PLACEHOLDER_PRESETS.has(presetName);
}

export function isQuickScenarioDesignFirstPreset(presetName) {
  return QUICK_SCENARIO_DESIGN_FIRST_PRESETS.has(presetName);
}
