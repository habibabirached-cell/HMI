/** Synthetic U.S. geography profiles for the configurator prototype. */

const RESOURCE_SCORE = { high: 1.0, medium: 0.62, low: 0.32 };

export const CONFIGURATOR_STATES = [
  { id: 'texas', label: 'Texas', solar: 'medium', wind: 'high', lcoeFactor: 1.0, carbonFactor: 1.0 },
  { id: 'wisconsin', label: 'Wisconsin', solar: 'low', wind: 'high', lcoeFactor: 1.0, carbonFactor: 1.0 },
  { id: 'arizona', label: 'Arizona', solar: 'high', wind: 'low', lcoeFactor: 0.96, carbonFactor: 0.94 },
  { id: 'idaho', label: 'Idaho', solar: 'medium', wind: 'high', lcoeFactor: 0.95, carbonFactor: 0.96 },
  { id: 'pennsylvania', label: 'Pennsylvania', solar: 'low', wind: 'medium', lcoeFactor: 1.04, carbonFactor: 1.0 },
  { id: 'california', label: 'California', solar: 'high', wind: 'medium', lcoeFactor: 1.12, carbonFactor: 0.88 },
  { id: 'virginia', label: 'Virginia', solar: 'medium', wind: 'medium', lcoeFactor: 1.05, carbonFactor: 1.02 },
  { id: 'iowa', label: 'Iowa', solar: 'low', wind: 'high', lcoeFactor: 0.94, carbonFactor: 0.97 },
  { id: 'nevada', label: 'Nevada', solar: 'high', wind: 'medium', lcoeFactor: 0.98, carbonFactor: 0.93 },
  { id: 'new_york', label: 'New York', solar: 'low', wind: 'medium', lcoeFactor: 1.14, carbonFactor: 0.9 },
];

export const CONFIGURATOR_CITIES = [
  { id: 'dallas_tx', label: 'Dallas, TX', stateId: 'texas' },
  { id: 'madison_wi', label: 'Madison, WI', stateId: 'wisconsin' },
  { id: 'houston_tx', label: 'Houston, TX', stateId: 'texas' },
  { id: 'phoenix_az', label: 'Phoenix, AZ', stateId: 'arizona' },
  { id: 'boise_id', label: 'Boise, ID', stateId: 'idaho' },
  { id: 'philadelphia_pa', label: 'Philadelphia, PA', stateId: 'pennsylvania' },
  { id: 'las_vegas_nv', label: 'Las Vegas, NV', stateId: 'nevada' },
  { id: 'northern_virginia', label: 'Northern Virginia', stateId: 'virginia' },
  { id: 'san_jose_ca', label: 'San Jose, CA', stateId: 'california' },
  { id: 'des_moines_ia', label: 'Des Moines, IA', stateId: 'iowa' },
  { id: 'schenectady_ny', label: 'Schenectady, NY', stateId: 'new_york' },
];

export function getStateById(stateId) {
  return CONFIGURATOR_STATES.find((s) => s.id === stateId);
}

export function getCityById(cityId) {
  return CONFIGURATOR_CITIES.find((c) => c.id === cityId);
}

export function getCitiesForState(stateId) {
  return CONFIGURATOR_CITIES.filter((c) => c.stateId === stateId);
}

export function getResourceProfile(stateId) {
  const state = getStateById(stateId) || CONFIGURATOR_STATES[0];
  return {
    stateLabel: state.label,
    solarResource: state.solar.charAt(0).toUpperCase() + state.solar.slice(1),
    windResource: state.wind.charAt(0).toUpperCase() + state.wind.slice(1),
    solarWeight: RESOURCE_SCORE[state.solar],
    windWeight: RESOURCE_SCORE[state.wind],
    lcoeFactor: state.lcoeFactor,
    carbonFactor: state.carbonFactor,
  };
}
