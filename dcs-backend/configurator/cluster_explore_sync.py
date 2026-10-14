"""Last Ideum → Maingear explore_data_sync payload (catch-up when wall UI opens)."""

from __future__ import annotations

from typing import Any

_last_explore_data_sync: dict[str, Any] | None = None


def remember_explore_data_sync(message: dict[str, Any]) -> None:
    global _last_explore_data_sync
    _last_explore_data_sync = dict(message)


def get_last_explore_data_sync() -> dict[str, Any] | None:
    return _last_explore_data_sync
