#!/usr/bin/env python3
"""
RTDS live meter bridge — run on Maingear Windows (where RSCAD FX is installed).

  python rtds_live_bridge.py

Listens ws://0.0.0.0:8765 — Docker backend connects via host.docker.internal:8765
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

from rtds_live_meter import RtdsLiveMeterReader, preflight_rscad_bindings

BRIDGE_HOST = os.environ.get("RTDS_BRIDGE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.environ.get("RTDS_BRIDGE_PORT", "8765"))


class BridgeState:
    def __init__(self) -> None:
        self.clients: set = set()
        self.reader: RtdsLiveMeterReader | None = None
        self.loop: asyncio.AbstractEventLoop | None = None
        self._preflight_ok, self._preflight_msg = preflight_rscad_bindings()

    def ensure_reader(self) -> None:
        if self.reader and self.reader.running:
            return
        if not self.loop:
            return
        if not self._preflight_ok:
            asyncio.run_coroutine_threadsafe(
                self.broadcast({"type": "error", "message": self._preflight_msg}),
                self.loop,
            )
            return

        def on_sample(sample: dict) -> None:
            if self.loop:
                asyncio.run_coroutine_threadsafe(self.broadcast(sample), self.loop)

        def on_error(message: str) -> None:
            if self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast({"type": "error", "message": message}),
                    self.loop,
                )

        self.reader = RtdsLiveMeterReader(on_sample=on_sample, on_error=on_error)
        self.reader.start()
        print("[rtds-bridge] RSCAD meter reader thread started", flush=True)

    def stop_reader(self) -> None:
        if self.reader:
            self.reader.stop()
            self.reader = None
            print("[rtds-bridge] RSCAD meter reader stopped", flush=True)

    async def broadcast(self, payload: dict) -> None:
        if not self.clients:
            return
        text = json.dumps(payload)
        dead = []
        for ws in self.clients:
            try:
                await ws.send(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)

    async def handle_client(self, websocket) -> None:
        self.clients.add(websocket)
        print(f"[rtds-bridge] HMI backend connected ({len(self.clients)} client(s))", flush=True)
        try:
            async for raw in websocket:
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                cmd = msg.get("type")
                if cmd == "start":
                    self.ensure_reader()
                    await websocket.send(json.dumps({"type": "rtds_status", "streaming": True}))
                elif cmd == "stop":
                    if len(self.clients) <= 1:
                        self.stop_reader()
                    await websocket.send(json.dumps({"type": "rtds_status", "streaming": False}))
        finally:
            self.clients.discard(websocket)
            print(f"[rtds-bridge] client disconnected ({len(self.clients)} left)", flush=True)
            if not self.clients:
                self.stop_reader()


async def main() -> None:
    state = BridgeState()
    state.loop = asyncio.get_running_loop()
    print(f"[rtds-bridge] Python: {sys.executable}", flush=True)
    print(f"[rtds-bridge] listening on ws://{BRIDGE_HOST}:{BRIDGE_PORT}", flush=True)
    if state._preflight_ok:
        print(f"[rtds-bridge] {state._preflight_msg}", flush=True)
    else:
        print("[rtds-bridge] WARNING — RSCAD bindings preflight failed:", flush=True)
        print(state._preflight_msg, flush=True)
    print("[rtds-bridge] Open RSCAD FX with your case before clicking Live RTDS.", flush=True)
    async with serve(state.handle_client, BRIDGE_HOST, BRIDGE_PORT):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[rtds-bridge] stopped", flush=True)
