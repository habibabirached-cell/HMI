"""
Edit these values on the Maingear Windows PC, then restart StartWinScreenSaver.bat.

Testing:  IDLE_SECONDS = 10
Production: IDLE_SECONDS = 10 * 60 * 10  # 6000 seconds (~100 minutes)
"""

# Seconds with no mouse movement before sweeping the cursor across all displays.
IDLE_SECONDS = 10

# How long one full desktop sweep takes (seconds).
SCAN_SECONDS = 10.0

# Number of horizontal passes during a sweep.
SCAN_LINES = 10

# How often the watcher checks whether idle time has elapsed (seconds).
POLL_SECONDS = 1.0
