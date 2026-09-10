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
    this._pendingMove = null;
    this._raf = null;
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
          if (msg.type === 'hello' && msg.bounds) {
            this.bounds = msg.bounds;
            if (!settled) {
              settled = true;
              resolve(msg.bounds);
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
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._pendingMove = null;
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

  _flushMove() {
    this._raf = null;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this._pendingMove) return;
    const payload = this._pendingMove;
    this._pendingMove = null;
    this.ws.send(JSON.stringify(payload));
  }

  /** Absolute virtual-desktop coordinates (from trackpad mapping). */
  sendMoveAbsolute(x, y) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this._pendingMove = { type: 'move', x: Math.round(x), y: Math.round(y) };
    if (!this._raf) {
      this._raf = requestAnimationFrame(() => this._flushMove());
    }
  }

  sendClick() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'click' }));
  }
}
