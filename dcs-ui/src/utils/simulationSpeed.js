/** Allowed playback speed multipliers (Simulation Controls grid). */
export const SIMULATION_SPEED_OPTIONS = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000];

/** Coerce a saved value to a valid speed button choice. */
export function normalizeSimulationSpeed(raw, fallback = 1) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  for (const opt of SIMULATION_SPEED_OPTIONS) {
    if (Math.abs(n - opt) < 1e-9) return opt;
  }
  return fallback;
}

/** Read simulation_speed from a scenario config or current_configuration blob. */
export function readSimulationSpeedFromConfig(configLike) {
  if (!configLike || typeof configLike !== 'object') return null;
  const cc = configLike.current_configuration;
  const raw =
    configLike.simulation_speed ??
    (cc && typeof cc === 'object' ? cc.simulation_speed : undefined);
  if (raw == null) return null;
  return normalizeSimulationSpeed(raw);
}
