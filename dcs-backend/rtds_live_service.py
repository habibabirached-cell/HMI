"""
Relay live RTDS samples to UI WebSocket clients.

Docker/Linux backends always use the Windows host bridge (rtds_live_bridge.py).
Only a native Windows backend without Docker may import RSCAD directly.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any, Optional, Set

from fastapi import WebSocket

from rtds_live_errors import format_bridge_unreachable_error
from rtds_live_meter import RtdsLiveMeterReader


def resolve_rtds_bridge_urls() -> list[str]:
    """Candidate WebSocket URLs for the Windows RTDS bridge (try in order)."""
    override = os.environ.get("RTDS_BRIDGE_URL")
    if override is not None:
        s = override.strip()
        if s.lower() in ("0", "false", "off", "none", "direct"):
            return []
        if s:
            return [s]

    in_docker = os.path.isfile("/.dockerenv")
    on_linux = sys.platform.startswith("linux")
    if not (in_docker or on_linux):
        return []

    # host.docker.internal needs extra_hosts: host-gateway in docker-compose (now on dcs-backend)
    candidates = [
        "ws://host.docker.internal:8765",
        "ws://172.17.0.1:8765",
    ]
    host_ip = os.environ.get("RTDS_BRIDGE_HOST_IP", "").strip()
    if host_ip:
        candidates.insert(0, f"ws://{host_ip}:8765")
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for u in candidates:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def resolve_rtds_bridge_url() -> str:
    urls = resolve_rtds_bridge_urls()
    return urls[0] if urls else ""


class RtdsLiveService:
    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._reader: Optional[RtdsLiveMeterReader] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._bridge_task: Optional[asyncio.Task] = None
        self._streaming = False

    @property
    def streaming(self) -> bool:
        if self._bridge_task and not self._bridge_task.done():
            return True
        return self._reader is not None and self._reader.running

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        self._clients.discard(websocket)
        if not self._clients:
            self.stop_streaming()

    async def _broadcast(self, payload: dict[str, Any]) -> None:
        if not self._clients:
            return
        text = json.dumps(payload)
        dead: list[WebSocket] = []
        for ws in self._clients:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._clients.discard(ws)

    def _schedule_broadcast(self, payload: dict[str, Any]) -> None:
        if not self._loop:
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(payload), self._loop)

    def start_streaming(self, loop: asyncio.AbstractEventLoop) -> bool:
        if self.streaming:
            return True
        self._loop = loop

        bridge_urls = resolve_rtds_bridge_urls()
        if bridge_urls:
            print(f"[RTDS] Will try bridge URL(s): {', '.join(bridge_urls)}", flush=True)
            self._bridge_task = loop.create_task(self._run_bridge_client(bridge_urls))
            self._streaming = True
            return True

        print("[RTDS] No bridge URL — importing RSCAD on this host (Windows native only)", flush=True)

        def on_sample(sample: dict[str, Any]) -> None:
            self._schedule_broadcast(sample)

        def on_error(message: str) -> None:
            self._schedule_broadcast({"type": "error", "message": message})

        self._reader = RtdsLiveMeterReader(on_sample=on_sample, on_error=on_error)
        self._reader.start()
        self._streaming = True
        return True

    async def _run_bridge_client(self, urls: list[str]) -> None:
        import websockets

        last_exc: Exception | None = None
        try:
            for url in urls:
                try:
                    print(f"[RTDS] Connecting to bridge {url} …", flush=True)
                    async with websockets.connect(url, open_timeout=8) as ws:
                        print(f"[RTDS] Bridge connected via {url} — sending start", flush=True)
                        await ws.send(json.dumps({"type": "start"}))
                        async for raw in ws:
                            try:
                                msg = json.loads(raw)
                            except json.JSONDecodeError:
                                continue
                            if msg.get("type") in ("sample", "error"):
                                await self._broadcast(msg)
                        return
                except Exception as exc:
                    last_exc = exc
                    print(f"[RTDS] Bridge connect failed ({url}): {exc}", flush=True)

            tried = ", ".join(urls)
            await self._broadcast(
                {
                    "type": "error",
                    "message": format_bridge_unreachable_error(
                        tried, last_exc or Exception("unknown")
                    ),
                }
            )
        finally:
            self._streaming = False
            self._bridge_task = None

    def stop_streaming(self) -> None:
        self._streaming = False
        if self._bridge_task and not self._bridge_task.done():
            self._bridge_task.cancel()
        self._bridge_task = None
        if self._reader:
            self._reader.stop()
            self._reader = None


rtds_live_service = RtdsLiveService()

# Log mode once at import (visible in docker logs)
_bridge = resolve_rtds_bridge_url()
if _bridge:
    print(f"[RTDS] Live mode: bridge → {_bridge}", flush=True)
else:
    print("[RTDS] Live mode: direct RSCAD import on this host", flush=True)
