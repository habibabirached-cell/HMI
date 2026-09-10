"""Maingear host kiosk focus bridge (Docker backend -> Windows Chrome windows)."""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request

KIOSK_FOCUS_BASE = os.environ.get(
    "KIOSK_FOCUS_HOST_URL", "http://host.docker.internal:8766"
).rstrip("/")

KIOSK_FOCUS_BY_COMMAND: dict[str, str] = {
    "showVernova": "Vernova",
    "showDcs": "Dcs",
}


def _post_kiosk_focus_sync(target: str) -> dict:
    url = f"{KIOSK_FOCUS_BASE}/kiosk/focus/{target}"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            if isinstance(payload, dict):
                payload.setdefault("ok", True)
                return payload
            return {"ok": True, "target": target}
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
        return {
            "ok": False,
            "error": str(exc),
            "hint": "On Maingear run z_genesis.start.bat (starts kiosk-focus-server on port 8766).",
        }


async def trigger_kiosk_focus(target: str) -> dict:
    return await asyncio.to_thread(_post_kiosk_focus_sync, target)
