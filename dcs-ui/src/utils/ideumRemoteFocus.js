/**
 * Ideum -> Maingear kiosk focus.
 * Physical Ideum must not call host :8766 directly (often not routed on cluster Ethernet).
 * Use WS :8767 and/or Maingear backend POST /api/cluster/remote-command (showDcs | showVernova).
 */

import { sendRemoteCommandToMaingear } from './clusterPeer';

const FOCUS_PORT = '8766';
const MAINGEAR_IP = '192.168.50.1';
const DIRECT_FOCUS_TIMEOUT_MS = 2500;

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

/** True when the touch UI should not POST to Maingear :8766 from the browser (use backend relay). */
export function shouldIdeumSkipDirectKioskFocusHttp(role) {
  if (role?.isIdeum || role?.isMalta) return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === '192.168.50.2') return true;
    if (host.startsWith('192.168.50.') && host !== MAINGEAR_IP) return true;
  }
  return false;
}

/** Maingear backend triggers focus on the host (Docker -> :8766 / PowerShell fallback). */
export async function sendKioskFocusViaMaingearBackend(role, focusCommand) {
  if (!focusCommand || !Object.prototype.hasOwnProperty.call(KIOSK_FOCUS_BY_COMMAND, focusCommand)) {
    return null;
  }
  try {
    return await sendRemoteCommandToMaingear(role, focusCommand);
  } catch (e) {
    console.warn('[cluster] kiosk focus via Maingear backend failed', focusCommand, e);
    return null;
  }
}

/** POST /kiosk/focus/Dcs or /kiosk/focus/Vernova — localhost / dev only on touch PC. */
export async function sendKioskFocusDirect(role, target) {
  const base = resolveMaingearFocusBaseUrl(role);
  const url = `${base}/kiosk/focus/${target}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_FOCUS_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Kiosk focus failed (${res.status})`);
    }
    return { ...data, focusUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

export function isDirectKioskFocusCommand(command) {
  return command != null && Object.prototype.hasOwnProperty.call(KIOSK_FOCUS_BY_COMMAND, command);
}
