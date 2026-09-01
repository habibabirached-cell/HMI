"""In-memory configurator session shared between Ideum (input) and Maingear wall (output)."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

_lock = asyncio.Lock()
_session: dict[str, Any] = {
    "sessionId": None,
    "status": "idle",
    "updatedAt": None,
    "inputs": None,
    "result": None,
    "error": None,
    "errorDetails": None,
    "source": None,
}


async def get_configurator_session() -> dict[str, Any]:
    async with _lock:
        return dict(_session)


async def submit_configurator_cluster(
    inputs: dict[str, Any],
    *,
    source: str | None,
    run_engine: Callable[[dict[str, Any]], dict[str, Any]],
    broadcast: Callable[[dict[str, Any]], Awaitable[int]],
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    session_id = str(uuid.uuid4())

    async with _lock:
        _session.update(
            {
                "sessionId": session_id,
                "status": "generating",
                "updatedAt": now,
                "inputs": inputs,
                "result": None,
                "error": None,
                "errorDetails": None,
                "source": source or "unknown",
            }
        )

    await broadcast({"type": "configurator_update", "session": await get_configurator_session()})

    try:
        result = run_engine(inputs)
        async with _lock:
            _session["status"] = "ready" if result.get("ok") else "error"
            _session["result"] = result
            _session["error"] = result.get("error")
            _session["errorDetails"] = result.get("details")
            _session["updatedAt"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:  # noqa: BLE001 — surface to wall display
        async with _lock:
            _session["status"] = "error"
            _session["result"] = None
            _session["error"] = str(exc)
            _session["errorDetails"] = None
            _session["updatedAt"] = datetime.now(timezone.utc).isoformat()

    await broadcast({"type": "configurator_update", "session": await get_configurator_session()})
    return await get_configurator_session()
