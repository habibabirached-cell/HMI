/**
 * Ideum -> Maingear wall mouse (direct WebSocket to host bridge :8767).
 */

const MOUSE_PORT = '8767';
const MAINGEAR_IP = '192.168.50.1';

export function resolveMaingearMouseWebSocketUrl(role) {
  const peer = (role?.peerBackendUrl || '').replace(/\/$/, '');
  if (peer) {
    try {
      const url = new URL(peer);
      return `ws://${url.hostname}:${MOUSE_PORT}`;
    } catch {
      /* fall through */
    }
  }
  return `ws://${MAINGEAR_IP}:${MOUSE_PORT}`;
}

export class IdeumRemoteMouseClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
  }

  connect() {
    if (this.ws) return Promise.resolve(this.bounds);
    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(this.bounds);
          }
        }, 400);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'hello') {
            if (msg.bounds) this.bounds = msg.bounds;
            this.capabilities = msg.capabilities || [];
            this.bridgeVersion = msg.version ?? 1;
            if (!this.capabilities.includes('focus')) {
              console.warn(
                '[ideum-mouse] Maingear KioskMouseServer is outdated (no focus). Restart BAT\\start-kiosk-mouse-server.bat',
              );
            }
            if (!settled) {
              settled = true;
              resolve(this.bounds);
            }
          }
        } catch {
          /* ignore */
        }
      };

      this.ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error(`Mouse bridge WebSocket failed (${this.url})`));
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.ws = null;
      };
    });
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
    this.connected = false;
  }

  /** Relative move in virtual-desktop pixels (trackpad drag — no jump on finger down). */
  sendMoveRelative(dx, dy) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const rdx = Math.round(dx);
    const rdy = Math.round(dy);
    if (rdx === 0 && rdy === 0) return;
    this.ws.send(JSON.stringify({ type: 'move', dx: rdx, dy: rdy }));
  }

  sendClick() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'click' }));
  }

  /** Bring DCS or Vernova Chrome kiosk to front (same WebSocket as trackpad). */
  sendFocus(target) {
    if (target !== 'Dcs' && target !== 'Vernova') return false;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ type: 'focus', target }));
    return true;
  }

  /** Connect if needed, then send focus (for Grid Connected / Back before trackpad opens). */
  async sendFocusAsync(target) {
    if (target !== 'Dcs' && target !== 'Vernova') return false;
    try {
      await this.connect();
    } catch (e) {
      console.warn('[ideum-mouse] connect for focus failed', e);
      return false;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    if (this.capabilities?.length && !this.capabilities.includes('focus')) {
      console.warn('[ideum-mouse] server has no focus capability — restart KioskMouseServer on Maingear');
      return false;
    }
    this.ws.send(JSON.stringify({ type: 'focus', target }));
    return true;
  }
}
