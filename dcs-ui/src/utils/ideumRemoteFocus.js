/**
 * Ideum -> Maingear kiosk focus (direct HTTP to host :8766, bypasses Docker backend).
 * Same low-latency pattern as ideumRemoteMouse.js (:8767).
 */

const FOCUS_PORT = '8766';
const MAINGEAR_IP = '192.168.50.1';

export const KIOSK_FOCUS_BY_COMMAND = {
  showVernova: 'Vernova',
  showDcs: 'Dcs',
};

export function resolveMaingearFocusBaseUrl(role) {
  const peer = (role?.peerBackendUrl || '').replace(/\/$/, '');
  if (peer) {
    try {
      const url = new URL(peer);
      return `http://${url.hostname}:${FOCUS_PORT}`;
    } catch {
      /* fall through */
    }
  }
  return `http://${MAINGEAR_IP}:${FOCUS_PORT}`;
}

/** POST /kiosk/focus/Dcs or /kiosk/focus/Vernova on Maingear host. */
export async function sendKioskFocusDirect(role, target) {
  const base = resolveMaingearFocusBaseUrl(role);
  const url = `${base}/kiosk/focus/${target}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Kiosk focus failed (${res.status})`);
  }
  return { ...data, focusUrl: url };
}

export function isDirectKioskFocusCommand(command) {
  return command != null && Object.prototype.hasOwnProperty.call(KIOSK_FOCUS_BY_COMMAND, command);
}
