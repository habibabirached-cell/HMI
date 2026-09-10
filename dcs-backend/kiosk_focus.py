"""Maingear host kiosk focus bridge (Docker backend -> Windows Chrome windows)."""

from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request

KIOSK_FOCUS_BY_COMMAND: dict[str, str] = {
    "showVernova": "Vernova",
    "showDcs": "Dcs",
}


def _focus_base_candidates() -> list[str]:
    """Host URLs for the Windows focus server (port 8766). Try in order."""
    ordered: list[str] = []
    env_base = (os.environ.get("KIOSK_FOCUS_HOST_URL") or "").strip().rstrip("/")
    if env_base:
        ordered.append(env_base)
    for base in (
        "http://host.docker.internal:8766",
        "http://192.168.50.1:8766",
        "http://127.0.0.1:8766",
    ):
        if base not in ordered:
            ordered.append(base)
    return ordered


def _no_proxy_opener() -> urllib.request.OpenerDirector:
    # Corporate HTTP_PROXY breaks host.docker.internal (Name or service not known).
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


def _post_kiosk_focus_sync(target: str) -> dict:
    opener = _no_proxy_opener()
    last_error: str | None = None
    tried: list[str] = []

    for base in _focus_base_candidates():
        url = f"{base}/kiosk/focus/{target}"
        tried.append(url)
        req = urllib.request.Request(
            url,
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with opener.open(req, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
                if isinstance(payload, dict):
                    payload.setdefault("ok", True)
                    payload["focusUrl"] = url
                    return payload
                return {"ok": True, "target": target, "focusUrl": url}
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                detail = json.loads(raw)
            except json.JSONDecodeError:
                detail = {"error": raw or exc.reason}
            if isinstance(detail, dict):
                detail.setdefault("ok", False)
                detail["focusUrl"] = url
                return detail
            return {"ok": False, "error": str(detail), "focusUrl": url}
        except Exception as exc:
            last_error = str(exc)
            continue

    return {
        "ok": False,
        "error": last_error or "Kiosk focus server unreachable",
        "tried": tried,
        "hint": (
            "On Maingear: run BAT\\start-kiosk-focus-server.bat (or z_genesis.start.bat), "
            "then restart dcs-backend Docker. Focus server must listen on port 8766."
        ),
    }


async def trigger_kiosk_focus(target: str) -> dict:
    return await asyncio.to_thread(_post_kiosk_focus_sync, target)
