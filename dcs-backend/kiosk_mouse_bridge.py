#!/usr/bin/env python3
"""
Maingear wall mouse bridge — run on Maingear Windows host (not in Docker).

  python kiosk_mouse_bridge.py

Listens ws://0.0.0.0:8767 — Ideum touch table connects directly over Ethernet
(ws://192.168.50.1:8767) for low-latency trackpad + click + focus.

Moves are queued to a dedicated thread so Vernova 3D load on the GPU/CPU cannot
block reading the next WebSocket frame (TCP backpressure).
"""

from __future__ import annotations

import asyncio
import json
import os
import queue
import subprocess
import sys
import threading
import urllib.error
import urllib.request

try:
    from websockets.server import serve
except ImportError:
    print("Install websockets: pip install websockets", file=sys.stderr)
    raise SystemExit(1)

if sys.platform != "win32":
    print("kiosk_mouse_bridge.py requires Windows (Maingear host).", file=sys.stderr)
    raise SystemExit(1)

import ctypes

user32 = ctypes.windll.user32

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

BRIDGE_HOST = os.environ.get("KIOSK_MOUSE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.environ.get("KIOSK_MOUSE_PORT", "8767"))
FOCUS_HOST = os.environ.get("KIOSK_FOCUS_HOST", "127.0.0.1")
FOCUS_PORT = int(os.environ.get("KIOSK_FOCUS_PORT", "8766"))
BRIDGE_VERSION = 2
BRIDGE_CAPABILITIES = ("move", "click", "focus")
# Set KIOSK_MOUSE_LOG_MOVES=1 to log every trackpad move (debug only).
LOG_MOVES = os.environ.get("KIOSK_MOUSE_LOG_MOVES", "0").strip().lower() not in (
    "0",
    "false",
    "no",
)
# Coalesce pending moves in the worker (sum dx/dy) before injecting — keeps cursor smooth under load.
COALESCE_MOVES = os.environ.get("KIOSK_MOUSE_COALESCE", "1").strip().lower() not in (
    "0",
    "false",
    "no",
)


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


def virtual_screen_bounds() -> dict[str, int]:
    return {
        "left": user32.GetSystemMetrics(76),   # SM_XVIRTUALSCREEN
        "top": user32.GetSystemMetrics(77),    # SM_YVIRTUALSCREEN
        "width": user32.GetSystemMetrics(78),  # SM_CXVIRTUALSCREEN
        "height": user32.GetSystemMetrics(79), # SM_CYVIRTUALSCREEN
    }


def _mouse_dword(value: int) -> int:
    value = int(value)
    return value & 0xFFFFFFFF


def move_relative(dx: int, dy: int) -> None:
    rdx = int(dx)
    rdy = int(dy)
    if rdx == 0 and rdy == 0:
        return
    user32.mouse_event(MOUSEEVENTF_MOVE, _mouse_dword(rdx), _mouse_dword(rdy), 0, 0)


def set_cursor_pos(x: int, y: int) -> None:
    bounds = virtual_screen_bounds()
    left = bounds["left"]
    top = bounds["top"]
    right = left + bounds["width"] - 1
    bottom = top + bounds["height"] - 1
    cx = max(left, min(right, int(x)))
    cy = max(top, min(bottom, int(y)))
    user32.SetCursorPos(cx, cy)


def left_click() -> None:
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


def beep_ideum_signal() -> None:
    try:
        import winsound

        winsound.Beep(880, 35)
    except Exception:
        user32.MessageBeep(0xFFFFFFFF)


class _MouseInputWorker:
    """Background thread — recv loop never waits on mouse_event or console I/O."""

    def __init__(self) -> None:
        self._q: queue.SimpleQueue = queue.SimpleQueue()
        self._thread = threading.Thread(target=self._run, name="kiosk-mouse-input", daemon=True)
        self._thread.start()

    def submit_move(self, dx: int, dy: int, *, peer=None, raw: str | None = None) -> None:
        self._q.put(("move", int(dx), int(dy), peer, raw))

    def submit_move_abs(self, x: int, y: int, *, peer=None, raw: str | None = None) -> None:
        self._q.put(("abs", int(x), int(y), peer, raw))

    def submit_click(self, *, peer=None, raw: str | None = None) -> None:
        self._q.put(("click", peer, raw))

    def submit_beep(self) -> None:
        self._q.put(("beep",))

    def _log(self, raw: str | None, peer) -> None:
        if LOG_MOVES and raw:
            print(f"[kiosk-mouse] recv {raw[:200]} from {peer}", flush=True)

    def _drain_coalesced_moves(self, first_kind: str, first_a: int, first_b: int, peer, raw: str | None):
        if first_kind == "abs":
            self._log(raw, peer)
            set_cursor_pos(first_a, first_b)
            return

        dx, dy = first_a, first_b
        self._log(raw, peer)
        while COALESCE_MOVES:
            try:
                item = self._q.get_nowait()
            except queue.Empty:
                break
            if not item or item[0] != "move":
                # Put non-move back — process on next loop iteration
                self._q.put(item)
                break
            _, mx, my, _, mraw = item
            dx += mx
            dy += my
            if LOG_MOVES and mraw:
                print(f"[kiosk-mouse] recv {mraw[:200]} from {peer}", flush=True)
        move_relative(dx, dy)

    def _run(self) -> None:
        while True:
            item = self._q.get()
            if item is None:
                break
            kind = item[0]
            if kind == "move":
                _, dx, dy, peer, raw = item
                self._drain_coalesced_moves("move", dx, dy, peer, raw)
            elif kind == "abs":
                _, x, y, peer, raw = item
                self._drain_coalesced_moves("abs", x, y, peer, raw)
            elif kind == "click":
                _, peer, raw = item
                if raw:
                    print(f"[kiosk-mouse] recv {raw[:200]} from {peer}", flush=True)
                left_click()
            elif kind == "beep":
                beep_ideum_signal()


INPUT_WORKER = _MouseInputWorker()


def _post_kiosk_focus_sync(target: str) -> dict:
    url = f"http://{FOCUS_HOST}:{FOCUS_PORT}/kiosk/focus/{target}"
    req = urllib.request.Request(
        url,
        data=b"{}",
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
        if isinstance(payload, dict):
            payload.setdefault("ok", True)
            return payload
        return {"ok": True, "target": target}


def _focus_script_path() -> str:
    return os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "BAT", "focus-kiosk-window.ps1")
    )


def _invoke_focus_powershell_sync(target: str) -> dict:
    """Same as maingear-kiosk-focus-*.bat when KioskFocusServer (:8766) is not running."""
    script = _focus_script_path()
    if not os.path.isfile(script):
        return {"ok": False, "error": f"focus script missing: {script}", "target": target}
    try:
        proc = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script,
                target,
            ],
            capture_output=True,
            text=True,
            timeout=45,
            cwd=os.path.dirname(script),
        )
    except Exception as exc:
        return {"ok": False, "error": str(exc), "target": target}
    if proc.returncode == 0:
        return {"ok": True, "target": target, "via": "powershell"}
    err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
    return {"ok": False, "error": err, "target": target}


def _should_fallback_focus(exc: BaseException) -> bool:
    if isinstance(exc, urllib.error.URLError):
        reason = getattr(exc, "reason", None)
        if reason is not None:
            winerr = getattr(reason, "winerror", None)
            if winerr == 10061:
                return True
        msg = str(exc).lower()
        return "refused" in msg or "10061" in msg
    msg = str(exc).lower()
    return "refused" in msg or "10061" in msg


async def focus_kiosk(target: str) -> dict:
    if target not in ("Dcs", "Vernova"):
        return {"ok": False, "error": "target must be Dcs or Vernova"}
    try:
        return await asyncio.to_thread(_post_kiosk_focus_sync, target)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw)
        except json.JSONDecodeError:
            detail = {"error": raw or exc.reason}
        if isinstance(detail, dict):
            detail.setdefault("ok", False)
            return detail
        return {"ok": False, "error": str(detail)}
    except Exception as exc:
        if _should_fallback_focus(exc):
            print(
                f"[kiosk-mouse] :{FOCUS_PORT} unavailable ({exc!s}); using PowerShell focus",
                flush=True,
            )
            return await asyncio.to_thread(_invoke_focus_powershell_sync, target)
        return {"ok": False, "error": str(exc)}


async def _handle_focus_async(websocket, target: str, peer) -> None:
    print(f"[kiosk-mouse] focus -> POST :{FOCUS_PORT}/kiosk/focus/{target} (async)", flush=True)
    INPUT_WORKER.submit_beep()
    result = await focus_kiosk(target)
    print(f"[kiosk-mouse] focus result: {result}", flush=True)
    try:
        await websocket.send(json.dumps({
            "ok": bool(result.get("ok")),
            "type": "focus",
            "target": target,
            **result,
        }))
    except Exception as exc:
        print(f"[kiosk-mouse] focus reply failed: {exc}", flush=True)


def dispatch_message(raw: str, peer, websocket) -> None:
    """Non-blocking dispatch — returns immediately; never awaits mouse I/O."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        print(f"[kiosk-mouse] recv invalid json from {peer}: {raw[:80]!r}", flush=True)
        return

    msg_type = (msg.get("type") or "").strip().lower()

    if msg_type == "move":
        if "x" in msg and "y" in msg:
            INPUT_WORKER.submit_move_abs(msg["x"], msg["y"], peer=peer, raw=raw)
        elif "dx" in msg and "dy" in msg:
            INPUT_WORKER.submit_move(msg["dx"], msg["dy"], peer=peer, raw=raw)
        else:
            print(f"[kiosk-mouse] bad move from {peer}: {raw[:120]}", flush=True)
        return

    if msg_type == "click":
        print(f"[kiosk-mouse] recv {raw[:200]} from {peer}", flush=True)
        INPUT_WORKER.submit_beep()
        INPUT_WORKER.submit_click(peer=peer, raw=None)
        return

    if msg_type == "focus":
        target = (msg.get("target") or "").strip()
        if target not in ("Dcs", "Vernova"):
            print(f"[kiosk-mouse] bad focus target from {peer}: {target}", flush=True)
            return
        print(f"[kiosk-mouse] recv {raw[:200]} from {peer}", flush=True)
        asyncio.create_task(_handle_focus_async(websocket, target, peer))
        return

    if msg_type == "ping":
        print(f"[kiosk-mouse] recv ping from {peer}", flush=True)
        INPUT_WORKER.submit_beep()
        asyncio.create_task(websocket.send(json.dumps({
            "ok": True,
            "type": "pong",
            "bounds": virtual_screen_bounds(),
        })))
        return

    print(f"[kiosk-mouse] unknown type from {peer}: {raw[:120]}", flush=True)


async def client_handler(websocket) -> None:
    peer = getattr(websocket, "remote_address", None)
    print(f"[kiosk-mouse] client connected {peer}", flush=True)
    INPUT_WORKER.submit_beep()
    try:
        await websocket.send(json.dumps({
            "type": "hello",
            "version": BRIDGE_VERSION,
            "capabilities": list(BRIDGE_CAPABILITIES),
            "bounds": virtual_screen_bounds(),
        }))
        async for raw in websocket:
            if not isinstance(raw, str):
                continue
            dispatch_message(raw, peer, websocket)
    except Exception as exc:
        print(f"[kiosk-mouse] client error: {exc}", flush=True)
    finally:
        print(f"[kiosk-mouse] client disconnected {peer}", flush=True)


async def main() -> None:
    bounds = virtual_screen_bounds()
    print(f"[kiosk-mouse] virtual desktop: {bounds}", flush=True)
    print(f"[kiosk-mouse] listening ws://{BRIDGE_HOST}:{BRIDGE_PORT} (TCP/WebSocket)", flush=True)
    print("[kiosk-mouse] moves -> background thread (non-blocking recv)", flush=True)
    async with serve(
        client_handler,
        BRIDGE_HOST,
        BRIDGE_PORT,
        max_size=2**16,
        max_queue=256,
        read_limit=2**18,
        write_limit=2**18,
    ):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
