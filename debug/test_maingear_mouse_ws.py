#!/usr/bin/env python3
"""Test Maingear kiosk mouse WebSocket bridge (run on Maingear)."""

from __future__ import annotations

import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("ws-test FAIL: pip install websockets")
    raise SystemExit(1)


async def main(host: str, port: int) -> int:
    url = f"ws://{host}:{port}"
    print(f"ws-test connecting {url}")
    try:
        async with websockets.connect(url, open_timeout=5) as ws:
            hello = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            print(f"ws-test hello: {hello}")
            bounds = hello.get("bounds") or {}
            cx = bounds.get("left", 0) + bounds.get("width", 1920) // 2
            cy = bounds.get("top", 0) + bounds.get("height", 1080) // 2
            await ws.send(json.dumps({"type": "move", "x": cx, "y": cy}))
            await ws.send(json.dumps({"type": "click"}))
            print(f"ws-test OK: moved to ({cx},{cy}) and clicked")
            return 0
    except Exception as exc:
        print(f"ws-test FAIL: {exc}")
        return 1


if __name__ == "__main__":
    h = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    p = int(sys.argv[2]) if len(sys.argv) > 2 else 8767
    raise SystemExit(asyncio.run(main(h, p)))
