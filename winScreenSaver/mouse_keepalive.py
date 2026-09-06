"""
Maingear OLED wall — idle mouse sweep (Windows host, outside Docker).

When the mouse is idle for IDLE_SECONDS (see config.py), moves the cursor across
the full virtual desktop, then waits for another idle period before repeating.

Double-click StartWinScreenSaver.bat to run. Close the window or press Ctrl+C to stop.
"""

from __future__ import annotations

import logging
import signal
import sys
import threading
import time
from typing import Callable

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("winScreenSaver")


class MouseKeepAlive:
    def __init__(
        self,
        *,
        idle_seconds: float,
        scan_seconds: float,
        scan_lines: int,
        poll_seconds: float,
        set_cursor: Callable[[int, int], None] | None = None,
        virtual_bounds: Callable[[], tuple[int, int, int, int]] | None = None,
    ) -> None:
        self.idle_seconds = idle_seconds
        self.scan_seconds = scan_seconds
        self.scan_lines = scan_lines
        self.poll_seconds = poll_seconds
        self._set_cursor = set_cursor or _set_cursor_pos
        self._virtual_bounds = virtual_bounds or _virtual_desktop_bounds
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
            logger.warning("Invalid virtual desktop bounds")
            return

        right = left + width - 1
        bottom = top + height - 1
        line_duration = self.scan_seconds / self.scan_lines
        steps_per_line = max(24, int(line_duration * 80))

        self._scanning = True
        try:
            logger.info(
                "Scanning %dx%d desktop (%d lines, %.1fs)",
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
            idle_for = self._seconds_idle()
            if idle_for >= self.idle_seconds:
                logger.info(
                    "Idle %.1fs (threshold %.1fs) — starting scan",
                    idle_for,
                    self.idle_seconds,
                )
                self._run_scan()
                self._mark_scan_complete()
            self._stop.wait(self.poll_seconds)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._virtual_bounds()
        self._set_cursor(0, 0)

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
            logger.info("Mouse listener started (pynput)")
        except Exception as exc:  # noqa: BLE001
            logger.warning("pynput unavailable (%s); timer-only mode", exc)
            self._listener = None

        self._stop.clear()
        self._thread = threading.Thread(target=self._watch_loop, name="mouse-keepalive", daemon=True)
        self._thread.start()
        logger.info(
            "Running — idle=%ds, scan=%.1fs, lines=%d (Ctrl+C to stop)",
            int(self.idle_seconds),
            self.scan_seconds,
            self.scan_lines,
        )

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


def _virtual_desktop_bounds() -> tuple[int, int, int, int]:
    import ctypes

    user32 = ctypes.windll.user32
    left = int(user32.GetSystemMetrics(76))   # SM_XVIRTUALSCREEN
    top = int(user32.GetSystemMetrics(77))    # SM_YVIRTUALSCREEN
    width = int(user32.GetSystemMetrics(78))  # SM_CXVIRTUALSCREEN
    height = int(user32.GetSystemMetrics(79))  # SM_CYVIRTUALSCREEN
    return left, top, width, height


def _set_cursor_pos(x: int, y: int) -> None:
    import ctypes

    if not ctypes.windll.user32.SetCursorPos(int(x), int(y)):
        raise OSError(f"SetCursorPos failed at ({x}, {y})")


def main() -> int:
    if sys.platform != "win32":
        print("winScreenSaver is Windows-only.")
        return 1

    keepalive = MouseKeepAlive(
        idle_seconds=max(1.0, float(config.IDLE_SECONDS)),
        scan_seconds=max(1.0, float(config.SCAN_SECONDS)),
        scan_lines=max(2, int(config.SCAN_LINES)),
        poll_seconds=max(0.25, float(config.POLL_SECONDS)),
    )

    stop_event = threading.Event()

    def handle_stop(signum, frame) -> None:  # noqa: ARG001
        logger.info("Stopping...")
        stop_event.set()

    signal.signal(signal.SIGINT, handle_stop)
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, handle_stop)

    keepalive.start()
    print("winScreenSaver is active. Leave this window open. Close it to stop.")
    try:
        while not stop_event.is_set():
            stop_event.wait(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        keepalive.stop()
        print("Stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
