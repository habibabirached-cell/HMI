"""
Maingear wall display keepalive — prevents 4K OLED panels from sleeping on static frames.

When the mouse is idle for KEEPALIVE_IDLE_MINUTES (default 10), sweeps the cursor across
the full virtual desktop in KEEPALIVE_SCAN_LINES horizontal passes over KEEPALIVE_SCAN_SECONDS,
then waits another idle period before repeating.

Windows only (uses SetCursorPos + pynput). Started automatically on Maingear backend startup.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from typing import Callable

logger = logging.getLogger(__name__)

IDLE_SECONDS = max(60, int(os.getenv("KEEPALIVE_IDLE_MINUTES", "10")) * 60)
SCAN_SECONDS = max(1.0, float(os.getenv("KEEPALIVE_SCAN_SECONDS", "10")))
SCAN_LINES = max(2, int(os.getenv("KEEPALIVE_SCAN_LINES", "10")))
POLL_SECONDS = max(1.0, float(os.getenv("KEEPALIVE_POLL_SECONDS", "5")))


class DisplayKeepAlive:
    def __init__(
        self,
        *,
        idle_seconds: float = IDLE_SECONDS,
        scan_seconds: float = SCAN_SECONDS,
        scan_lines: int = SCAN_LINES,
        poll_seconds: float = POLL_SECONDS,
        set_cursor: Callable[[int, int], None] | None = None,
        virtual_bounds: Callable[[], tuple[int, int, int, int]] | None = None,
    ) -> None:
        self.idle_seconds = idle_seconds
        self.scan_seconds = scan_seconds
        self.scan_lines = scan_lines
        self.poll_seconds = poll_seconds
        self._set_cursor = set_cursor or _default_set_cursor
        self._virtual_bounds = virtual_bounds or _default_virtual_bounds
        self._last_activity = time.monotonic()
        self._scanning = False
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._listener = None
        self._lock = threading.Lock()

    def note_user_activity(self) -> None:
        if self._scanning:
            return
        with self._lock:
            self._last_activity = time.monotonic()

    def _seconds_idle(self) -> float:
        with self._lock:
            return time.monotonic() - self._last_activity

    def _mark_scan_complete(self) -> None:
        with self._lock:
            self._last_activity = time.monotonic()

    def _run_scan(self) -> None:
        left, top, width, height = self._virtual_bounds()
        if width <= 0 or height <= 0:
            logger.warning("Display keepalive: invalid virtual desktop bounds")
            return

        right = left + width - 1
        bottom = top + height - 1
        line_duration = self.scan_seconds / self.scan_lines
        steps_per_line = max(24, int(line_duration * 80))

        self._scanning = True
        try:
            logger.info(
                "Display keepalive: scanning %dx%d desktop (%d lines, %.1fs)",
                width,
                height,
                self.scan_lines,
                self.scan_seconds,
            )
            for line_index in range(self.scan_lines):
                if self._stop.is_set():
                    break
                y_den = max(self.scan_lines - 1, 1)
                y = int(top + (bottom - top) * line_index / y_den)
                for step in range(steps_per_line + 1):
                    if self._stop.is_set():
                        return
                    x = int(left + (right - left) * step / steps_per_line)
                    self._set_cursor(x, y)
                    time.sleep(line_duration / steps_per_line)
        finally:
            self._scanning = False

    def _watch_loop(self) -> None:
        while not self._stop.is_set():
            if self._seconds_idle() >= self.idle_seconds:
                self._run_scan()
                self._mark_scan_complete()
            self._stop.wait(self.poll_seconds)

    def start(self) -> bool:
        if self._thread and self._thread.is_alive():
            return True

        if sys.platform != "win32":
            logger.info("Display keepalive: skipped (Windows-only; platform=%s)", sys.platform)
            return False

        try:
            self._virtual_bounds()
            self._set_cursor(0, 0)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Display keepalive: cursor API unavailable (%s)", exc)
            return False

        try:
            from pynput import mouse

            def on_move(x, y) -> None:  # noqa: ARG001
                self.note_user_activity()

            def on_click(x, y, button, pressed) -> None:  # noqa: ARG001
                self.note_user_activity()

            def on_scroll(x, y, dx, dy) -> None:  # noqa: ARG001
                self.note_user_activity()

            self._listener = mouse.Listener(
                on_move=on_move,
                on_click=on_click,
                on_scroll=on_scroll,
            )
            self._listener.start()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Display keepalive: pynput unavailable (%s); using timer-only mode", exc)
            self._listener = None

        self._stop.clear()
        self._thread = threading.Thread(
            target=self._watch_loop,
            name="display-keepalive",
            daemon=True,
        )
        self._thread.start()
        logger.info(
            "Display keepalive: started (idle=%ds, scan=%.1fs, lines=%d)",
            int(self.idle_seconds),
            self.scan_seconds,
            self.scan_lines,
        )
        return True

    def stop(self) -> None:
        self._stop.set()
        if self._listener is not None:
            try:
                self._listener.stop()
            except Exception:  # noqa: BLE001
                pass
            self._listener = None
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None


def _default_virtual_bounds() -> tuple[int, int, int, int]:
    if sys.platform != "win32":
        raise OSError("virtual desktop bounds are Windows-only")
    import ctypes

    user32 = ctypes.windll.user32
    left = int(user32.GetSystemMetrics(76))   # SM_XVIRTUALSCREEN
    top = int(user32.GetSystemMetrics(77))    # SM_YVIRTUALSCREEN
    width = int(user32.GetSystemMetrics(78))  # SM_CXVIRTUALSCREEN
    height = int(user32.GetSystemMetrics(79))  # SM_CYVIRTUALSCREEN
    return left, top, width, height


def _default_set_cursor(x: int, y: int) -> None:
    if sys.platform != "win32":
        raise OSError("SetCursorPos is Windows-only")
    import ctypes

    if not ctypes.windll.user32.SetCursorPos(int(x), int(y)):
        raise OSError(f"SetCursorPos failed at ({x}, {y})")


_keepalive: DisplayKeepAlive | None = None


def start_display_keepalive() -> bool:
    """Start the background keepalive thread (idempotent)."""
    global _keepalive
    if _keepalive is None:
        _keepalive = DisplayKeepAlive()
    return _keepalive.start()


def stop_display_keepalive() -> None:
    global _keepalive
    if _keepalive is not None:
        _keepalive.stop()
