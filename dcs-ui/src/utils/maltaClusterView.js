/** Malta: one PC, two fullscreen DCS tabs — touch (Ideum) vs wall (Maingear role). */
export const MALTA_VIEW_PARAM = 'maltaView';

export function getMaltaViewFromUrl(locationSearch) {
  if (typeof window === 'undefined' && locationSearch == null) return null;
  const q = locationSearch ?? window.location.search;
  const v = new URLSearchParams(q).get(MALTA_VIEW_PARAM);
  if (v === 'touch' || v === 'wall') return v;
  return null;
}

export function isMaltaTouchClient(machineRole, maltaView = getMaltaViewFromUrl()) {
  return Boolean(machineRole?.isMalta && maltaView === 'touch');
}

export function isMaltaWallClient(machineRole, maltaView = getMaltaViewFromUrl()) {
  return Boolean(machineRole?.isMalta && maltaView === 'wall');
}

/** True when this browser should execute remote wall commands (Maingear or Malta wall tab). */
export function isClusterWallCommandTarget(machineRole, maltaView = getMaltaViewFromUrl()) {
  if (isMaltaWallClient(machineRole, maltaView)) return true;
  if (machineRole?.isMaingear && !machineRole?.isMalta) return true;
  return false;
}

/** True when this browser may send Ideum remote commands to the peer backend. */
export function isClusterTouchCommandSource(machineRole, maltaView = getMaltaViewFromUrl()) {
  if (isMaltaTouchClient(machineRole, maltaView)) return true;
  if (machineRole?.isIdeum && !machineRole?.isMalta) return true;
  return false;
}
