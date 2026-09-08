/**
 * Ideum touch-table components — separate from regular schematic blocks.
 * They look like 3D equipment previews but only fire remote cluster commands.
 */

export const IDEUM_TURBINE_BUTTON_TYPE = 'ideum-turbine-button';
export const IDEUM_BESS_GFME_BUTTON_TYPE = 'ideum-bess-gfme-button';
export const IDEUM_BESS_BUTTON_TYPE = 'ideum-bess-button';
export const IDEUM_GFME_BUTTON_TYPE = 'ideum-gfme-button';
export const IDEUM_EXPANSION_PANEL_TYPE = 'ideum-expansion-panel';
export const IDEUM_MAINGEAR_VIEW_PANEL_TYPE = 'ideum-maingear-view-panel';

export const IDEUM_START_SIMULATION_BUTTON_TYPE = 'ideum-start-simulation-button';
export const IDEUM_SIMULATE_BUTTON_TYPE = 'ideum-simulate-button';
export const IDEUM_SIMULATE_LOOP_BUTTON_TYPE = 'ideum-simulate-loop-button';
export const IDEUM_SIMULATION_SPEED_PANEL_TYPE = 'ideum-simulation-speed-panel';

export const IDEUM_COMPONENT_TYPES = new Set([
  IDEUM_TURBINE_BUTTON_TYPE,
  IDEUM_BESS_GFME_BUTTON_TYPE,
  IDEUM_BESS_BUTTON_TYPE,
  IDEUM_GFME_BUTTON_TYPE,
  IDEUM_EXPANSION_PANEL_TYPE,
  IDEUM_MAINGEAR_VIEW_PANEL_TYPE,
  IDEUM_START_SIMULATION_BUTTON_TYPE,
  IDEUM_SIMULATE_BUTTON_TYPE,
  IDEUM_SIMULATE_LOOP_BUTTON_TYPE,
  IDEUM_SIMULATION_SPEED_PANEL_TYPE,
]);

export function isIdeumDesignName(name) {
  return typeof name === 'string' && /^Ideum/i.test(name.trim());
}

export function isIdeumComponent(component) {
  return IDEUM_COMPONENT_TYPES.has(component?.type);
}

export function getIdeumComponents(components) {
  if (!Array.isArray(components)) return [];
  return components.filter(isIdeumComponent);
}

export function getIdeumCommand(component) {
  const cmd = component?.properties?.ideumCommand;
  return typeof cmd === 'string' && cmd.trim() ? cmd.trim() : null;
}

export function getIdeumTitle(component) {
  const title = component?.properties?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return component?.name || 'Ideum button';
}

/** Static PNG/JPEG preview inside an Ideum button (no WebGL). */
export function getIdeumPreviewImageUrl(component) {
  const raw =
    component?.visualOverrides?.previewImageUrl ?? component?.properties?.previewImageUrl;
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;
  if (url.startsWith('/')) {
    return `${process.env.PUBLIC_URL || ''}${url}`;
  }
  return url;
}

export function ideumButtonPayload(component) {
  const command = getIdeumCommand(component);
  if (!command) return null;
  return {
    command,
    label: getIdeumTitle(component),
    componentId: component.id,
  };
}

export function isIdeumBessGfmeButton(component) {
  return component?.type === IDEUM_BESS_GFME_BUTTON_TYPE;
}

export function isIdeumBessButton(component) {
  return component?.type === IDEUM_BESS_BUTTON_TYPE;
}

export function isIdeumGfmeButton(component) {
  return component?.type === IDEUM_GFME_BUTTON_TYPE;
}

export function isIdeumTurbineButton(component) {
  return component?.type === IDEUM_TURBINE_BUTTON_TYPE;
}

export function isIdeumExpansionPanel(component) {
  return component?.type === IDEUM_EXPANSION_PANEL_TYPE;
}

export function isIdeumMaingearViewPanel(component) {
  return component?.type === IDEUM_MAINGEAR_VIEW_PANEL_TYPE;
}

export function isIdeumStartSimulationButton(component) {
  return component?.type === IDEUM_START_SIMULATION_BUTTON_TYPE;
}

export function isIdeumSimulateButton(component) {
  return component?.type === IDEUM_SIMULATE_BUTTON_TYPE;
}

export function isIdeumSimulateLoopButton(component) {
  return component?.type === IDEUM_SIMULATE_LOOP_BUTTON_TYPE;
}

export function isIdeumSimulationSpeedPanel(component) {
  return component?.type === IDEUM_SIMULATION_SPEED_PANEL_TYPE;
}

export function getIdeumExpansionPanels(components) {
  if (!Array.isArray(components)) return [];
  return components.filter(isIdeumExpansionPanel);
}

export function getIdeumButtonStyleClass(component) {
  if (isIdeumSimulateButton(component)) return 'ideum-component-btn--simulate-icon';
  if (isIdeumSimulateLoopButton(component)) return 'ideum-component-btn--simulate-loop-icon';
  if (isIdeumStartSimulationButton(component)) return 'ideum-component-btn--start-sim';
  if (isIdeumBessGfmeButton(component)) return 'ideum-component-btn--grouped';
  if (isIdeumBessButton(component)) return 'ideum-component-btn--bess-only';
  if (isIdeumGfmeButton(component)) return 'ideum-component-btn--gfme-only';
  return 'ideum-component-btn--turbine';
}
