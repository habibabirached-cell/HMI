/** Consistent technology colors across configurator visualizations. */

export const CONF_TECHNOLOGY_COLORS = {
  heavyDutyGT: '#005E60',
  aeroderivativeGT: '#1a8b8d',
  hd7ha02: '#005E60',
  hd7f05: '#00796B',
  lm2500g4: '#1a8b8d',
  lm250022mw: '#26A69A',
  solar: '#F5A623',
  wind: '#4A90D9',
  battery: '#7B68EE',
  thermal: '#005E60',
  fuelCell: '#6B8E23',
  recipEngine: '#8B6914',
};

export function getTechnologyColor(techId) {
  return CONF_TECHNOLOGY_COLORS[techId] || '#64748b';
}
