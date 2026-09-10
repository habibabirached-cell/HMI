#!/usr/bin/env python3
"""
Maingear wall mouse bridge — run on Maingear Windows host (not in Docker).

  python kiosk_mouse_bridge.py

Listens ws://0.0.0.0:8767 — Ideum touch table connects directly over Ethernet
(ws://192.168.50.1:8767) for low-latency trackpad + click + kiosk focus.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

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
FOCUS_SCRIPT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "BAT", "focus-kiosk-window.ps1")
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
    """mouse_event dx/dy are DWORD — preserve sign for relative motion."""
    value = int(value)
    return value & 0xFFFFFFFF


def move_relative(dx: int, dy: int) -> None:
    """Inject relative motion like a physical mouse (not SetCursorPos)."""
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


async def focus_kiosk_async(target: str) -> None:
    if target not in ("Dcs", "Vernova"):
        return
    if not os.path.isfile(FOCUS_SCRIPT):
        print(f"[kiosk-mouse] focus script missing: {FOCUS_SCRIPT}", flush=True)
        return
    try:
        proc = await asyncio.create_subprocess_exec(
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            FOCUS_SCRIPT,
            target,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, err = await proc.communicate()
        if proc.returncode != 0:
            detail = err.decode(errors="replace").strip() if err else "unknown error"
            print(f"[kiosk-mouse] focus {target} failed: {detail}", flush=True)
        else:
            print(f"[kiosk-mouse] focus {target} ok", flush=True)
    except Exception as exc:
        print(f"[kiosk-mouse] focus {target} error: {exc}", flush=True)


async def handle_message(raw: str) -> dict | None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return {"ok": False, "error": "invalid json"}

    msg_type = (msg.get("type") or "").strip().lower()
    if msg_type == "ping":
        return {"ok": True, "type": "pong", "bounds": virtual_screen_bounds()}

    if msg_type == "move":
        if "x" in msg and "y" in msg:
            await asyncio.to_thread(set_cursor_pos, msg["x"], msg["y"])
            return {"ok": True, "type": "move"}
        if "dx" in msg and "dy" in msg:
            await asyncio.to_thread(move_relative, msg["dx"], msg["dy"])
            return None
        return {"ok": False, "error": "move requires x,y or dx,dy"}

    if msg_type == "click":
        await asyncio.to_thread(left_click)
        return {"ok": True, "type": "click"}

    if msg_type == "focus":
        target = (msg.get("target") or "").strip()
        if target in ("Dcs", "Vernova"):
            asyncio.create_task(focus_kiosk_async(target))
            return {"ok": True, "type": "focus", "target": target}
        return {"ok": False, "error": "focus target must be Dcs or Vernova"}

    return {"ok": False, "error": f"unknown type: {msg_type}"}


async def client_handler(websocket) -> None:
    peer = getattr(websocket, "remote_address", None)
    print(f"[kiosk-mouse] client connected {peer}", flush=True)
    try:
        await websocket.send(json.dumps({"type": "hello", "bounds": virtual_screen_bounds()}))
        async for raw in websocket:
            if not isinstance(raw, str):
                continue
            reply = await handle_message(raw)
            if reply is not None:
                await websocket.send(json.dumps(reply))
    except Exception as exc:
        print(f"[kiosk-mouse] client error: {exc}", flush=True)
    finally:
        print(f"[kiosk-mouse] client disconnected {peer}", flush=True)


async def main() -> None:
    bounds = virtual_screen_bounds()
    print(f"[kiosk-mouse] virtual desktop: {bounds}", flush=True)
    print(f"[kiosk-mouse] listening ws://{BRIDGE_HOST}:{BRIDGE_PORT}", flush=True)
    async with serve(client_handler, BRIDGE_HOST, BRIDGE_PORT, max_size=2**16):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
