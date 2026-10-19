"""
Edit these values on the Maingear Windows PC, then restart StartWinScreenSaver.bat.
"""

# Seconds with no mouse movement before sweeping the cursor across all displays.
# 300 = 5 minutes.
IDLE_SECONDS = 300

# How long one full desktop sweep takes (seconds).
SCAN_SECONDS = 3.0

# Number of horizontal passes during a sweep (vertical grid positions).
SCAN_LINES = 10

# Skip the bottom N grid lines so the cursor never reaches the taskbar edge.
SCAN_SKIP_BOTTOM_LINES = 1

# How often the watcher checks whether idle time has elapsed (seconds).
POLL_SECONDS = 1.0
