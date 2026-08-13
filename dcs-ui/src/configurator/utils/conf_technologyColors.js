/** Consistent technology colors across configurator visualizations. */

export const CONF_TECHNOLOGY_COLORS = {
  heavyDutyGT: '#005E60',
  aeroderivativeGT: '#1a8b8d',
  solar: '#F5A623',
  wind: '#4A90D9',
  battery: '#7B68EE',
  fuelCell: '#6B8E23',
  recipEngine: '#8B6914',
};

export function getTechnologyColor(techId) {
  return CONF_TECHNOLOGY_COLORS[techId] || '#64748b';
}
