/**
 * Ideum touch-table components — separate from regular schematic blocks.
 * They look like 3D equipment previews but only fire remote cluster commands.
 */

export const IDEUM_TURBINE_BUTTON_TYPE = 'ideum-turbine-button';
export const IDEUM_BESS_GFME_BUTTON_TYPE = 'ideum-bess-gfme-button';

export const IDEUM_COMPONENT_TYPES = new Set([
  IDEUM_TURBINE_BUTTON_TYPE,
  IDEUM_BESS_GFME_BUTTON_TYPE,
]);

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

export function isIdeumTurbineButton(component) {
  return component?.type === IDEUM_TURBINE_BUTTON_TYPE;
}
