"""
Maingear ↔ Ideum cluster: machine role and real-time remote commands.

Role is determined from cluster.local.json (written by set-*-ethernet-ip.bat).
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from fastapi import WebSocket

CLUSTER_LOCAL_FILENAME = "cluster.local.json"
MAINGEAR_ETHERNET_IP = "192.168.50.1"
IDEUM_ETHERNET_IP = "192.168.50.2"

# Design-load commands are not queued for replay — stale loads would reset Maingear mid-demo.
NON_REPLAY_REMOTE_COMMANDS = frozenset({
    "loadHdAero",
    "loadP2R18",
    "loadWind02",
    "resetHdAero",
})

VALID_REMOTE_COMMANDS = frozenset({
    "add8Turbines",
    "addStatcomAndGFMe",
    "addBessOnly",
    "addGfmeOnly",
    "addMvupsOnly",
    "showPlotsForCurrentDesign",
    "toggleSimulation",
    "toggleBreakersExpansion",
    "togglePeripheralsExpansion",
    "startSimulation",
    "startSimulationLoop",
    "stopSimulation",
    "setSimulationSpeed",
    "reset",
    "liveRtds",
    "loadHdAero",
    "resetHdAero",
    "loadP2R18",
    "loadWind02",
    "toggleInteractiveBreaker",
    "showVernova",
    "showDcs",
    "openDataExploration",
    "openExploreData",
})


def cluster_local_path() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), CLUSTER_LOCAL_FILENAME)


def load_cluster_config() -> dict[str, Any]:
    path = cluster_local_path()
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def write_cluster_config(
    *,
    role: str,
    ethernet_ip: str,
    peer_ethernet_ip: str,
    peer_backend_url: str,
) -> str:
    path = cluster_local_path()
    payload = {
        "role": role,
        "ethernetIp": ethernet_ip,
        "peerEthernetIp": peer_ethernet_ip,
        "peerBackendUrl": peer_backend_url,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return path


def resolve_machine_role() -> dict[str, Any]:
    cfg = load_cluster_config()
    ip = (cfg.get("ethernetIp") or "").strip()
    role = (cfg.get("role") or "").strip().lower()

    if not role:
        if ip == MAINGEAR_ETHERNET_IP:
            role = "maingear"
        elif ip == IDEUM_ETHERNET_IP:
            role = "ideum"
        else:
            env_role = (os.environ.get("CLUSTER_ROLE") or "").strip().lower()
            if env_role in ("maingear", "ideum", "dev"):
                role = env_role
            elif not cfg:
                role = "unknown"
            else:
                role = "unknown"

    peer_ip = (cfg.get("peerEthernetIp") or "").strip()
    if not peer_ip:
        if role == "maingear":
            peer_ip = IDEUM_ETHERNET_IP
        elif role == "ideum":
            peer_ip = MAINGEAR_ETHERNET_IP
        else:
            peer_ip = ""

    peer_backend = (cfg.get("peerBackendUrl") or os.environ.get("CLUSTER_PEER_BACKEND_URL") or "").strip()
    if not peer_backend:
        if role == "dev":
            peer_backend = "http://127.0.0.1:5000"
        else:
            peer_backend = f"http://{MAINGEAR_ETHERNET_IP}:5000"

    is_malta = role == "malta"
    is_dev = role == "dev"
    return {
        "role": role,
        "ethernetIp": ip or None,
        "peerEthernetIp": peer_ip or None,
        "peerBackendUrl": peer_backend,
        "isMalta": is_malta,
        "isDev": is_dev,
        "isMaingear": role == "maingear" or is_malta,
        "isIdeum": role == "ideum" or is_malta,
        "combinedWallAndTouch": bool(cfg.get("combinedWallAndTouch")) or is_malta,
        "maingearEthernetIp": MAINGEAR_ETHERNET_IP,
        "ideumEthernetIp": IDEUM_ETHERNET_IP,
    }


class ClusterConnectionManager:
    """WebSocket clients on this machine (Maingear UI listens for remote commands)."""

    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._pending_messages: list[dict[str, Any]] = []
        self._max_pending = 32

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)
            pending = list(self._pending_messages)
            self._pending_messages.clear()
        for msg in pending:
            try:
                await websocket.send_text(json.dumps(msg))
            except Exception:
                pass

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> int:
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        sent = 0
        async with self._lock:
            clients = list(self._clients)
        for ws in clients:
            try:
                await ws.send_text(payload)
                sent += 1
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._clients.discard(ws)
        if sent == 0 and message.get("command") not in NON_REPLAY_REMOTE_COMMANDS:
            async with self._lock:
                self._pending_messages.append(message)
                if len(self._pending_messages) > self._max_pending:
                    self._pending_messages = self._pending_messages[-self._max_pending :]
        return sent


cluster_manager = ClusterConnectionManager()
