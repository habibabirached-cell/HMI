"""
Poll W, Tm, Te meters from an active RSCAD FX case (Maingear / RTDS host).

Same flow as Socket_v2.py:
  rtds.rscadfx.remote_connection() → open_case() → read meters in a loop.

Configure via environment variables:
  RSCAD_BIN_PATH  — path to RSCAD FX BIN/lib
  RTDS_CASE_PATH  — .rtfx case file to open
"""

from __future__ import annotations

import os
import sys
import threading
import time
from typing import Callable, Optional

from rtds_live_errors import (
    format_docker_direct_import_error,
    format_rscad_import_error,
    format_rscad_session_error,
)

RSCAD_PATH = os.environ.get(
    "RSCAD_BIN_PATH",
    r"C:\Program Files\RTDS\RSCAD FX 2.7\BIN\lib",
)
CASE_PATH = os.environ.get(
    "RTDS_CASE_PATH",
    r"C:\DataCenter_CustomerExpCenter\RTDS\LM2500_8units_0611\LM2500_8units\Lm2500_8units_wplayback.rtfx",
)
POLL_INTERVAL_S = float(os.environ.get("RTDS_POLL_INTERVAL_S", "0.1"))

SampleCallback = Callable[[dict], None]
ErrorCallback = Callable[[str], None]


def _import_rscadfx():
    if not os.path.isdir(RSCAD_PATH):
        raise ImportError(
            f"RSCAD lib folder not found: {RSCAD_PATH} (set RSCAD_BIN_PATH)"
        )
    if RSCAD_PATH not in sys.path:
        sys.path.append(RSCAD_PATH)
    import rtds.rscadfx  # type: ignore

    return rtds.rscadfx


def preflight_rscad_bindings() -> tuple[bool, str]:
    """Test import before the bridge accepts HMI connections."""
    try:
        _import_rscadfx()
        return True, f"RSCAD bindings OK (path: {RSCAD_PATH})"
    except Exception as exc:
        return False, format_rscad_import_error(exc)


class RtdsLiveMeterReader:
    """Background thread: connect to RSCAD FX and stream meter samples."""

    def __init__(
        self,
        on_sample: SampleCallback,
        on_error: Optional[ErrorCallback] = None,
    ):
        self._on_sample = on_sample
        self._on_error = on_error or (lambda _msg: None)
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.running:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="rtds-live-meter", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        self._thread = None

    def _run(self) -> None:
        t0 = time.monotonic()
        in_docker = os.path.isfile("/.dockerenv") or sys.platform.startswith("linux")
        try:
            rscadfx = _import_rscadfx()
        except Exception as exc:
            msg = (
                format_docker_direct_import_error(exc)
                if in_docker
                else format_rscad_import_error(exc)
            )
            self._on_error(msg)
            return

        try:
            print("Connecting to the active RSCAD FX application...", flush=True)
            with rscadfx.remote_connection() as app:
                print("Connected successfully!", flush=True)
                print(f"Opening case: {CASE_PATH}", flush=True)
                case = app.open_case(CASE_PATH)
                sw2 = case.get_object_by_name(
                    "SW2", "switch", subtab="Runtime", subpage="gen1_original-Tab1"
                )
                playback = case.get_object_by_name(
                    "PlayBack", "button", subtab="Runtime", subpage="gen1_original-Tab1"
                )
                meter_w = case.get_object_by_name(
                    "W", "meter", subtab="Runtime", subpage="gen1_original-Tab1"
                )
                meter_tm = case.get_object_by_name(
                    "TM", "meter", subtab="Runtime", subpage="gen1_original-Tab1"
                )
                meter_te = case.get_object_by_name(
                    "TE", "meter", subtab="Runtime", subpage="gen1_original-Tab1"
                )

                sw2.position = 0
                playback.position = 1
                playback.position = 0
                print("Waiting 1 second...", flush=True)
                time.sleep(1.0)
                print("Live meter streaming started (W, Tm, Te).", flush=True)

                while not self._stop.is_set():
                    elapsed = time.monotonic() - t0
                    try:
                        w_val = float(meter_w.value)
                        tm_val = float(meter_tm.value)
                        te_val = float(meter_te.value)
                    except Exception as exc:
                        self._on_error(f"Meter read failed: {exc}")
                        time.sleep(POLL_INTERVAL_S)
                        continue

                    print(
                        f"Live Meter Reading (W, Tm, Te): {w_val}, {tm_val}, {te_val}",
                        flush=True,
                    )
                    self._on_sample(
                        {
                            "type": "sample",
                            "t": round(elapsed, 3),
                            "W": w_val,
                            "Tm": tm_val,
                            "Te": te_val,
                        }
                    )
                    time.sleep(POLL_INTERVAL_S)
        except Exception as exc:
            self._on_error(format_rscad_session_error(exc))
