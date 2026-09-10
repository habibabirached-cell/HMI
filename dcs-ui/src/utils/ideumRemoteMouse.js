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
    this._pendingDx = 0;
    this._pendingDy = 0;
    this._flushRaf = null;
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

  _flushPendingMove() {
    this._flushRaf = null;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._pendingDx = 0;
      this._pendingDy = 0;
      return;
    }
    const rdx = Math.round(this._pendingDx);
    const rdy = Math.round(this._pendingDy);
    this._pendingDx = 0;
    this._pendingDy = 0;
    if (rdx === 0 && rdy === 0) return;
    try {
      this.ws.send(JSON.stringify({ type: 'move', dx: rdx, dy: rdy }));
    } catch (e) {
      console.warn('[ideum-mouse] move send failed', e);
    }
  }

  /** Queue relative move — never blocks the pointer handler (avoids touch coalescing stalls). */
  sendMoveRelative(dx, dy) {
    this._pendingDx += dx;
    this._pendingDy += dy;
    if (this._flushRaf != null) return;
    this._flushRaf = requestAnimationFrame(() => this._flushPendingMove());
  }

  /** Send any queued deltas immediately (call on pointer up). */
  flushMoves() {
    if (this._flushRaf != null) {
      cancelAnimationFrame(this._flushRaf);
      this._flushRaf = null;
    }
    this._flushPendingMove();
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
