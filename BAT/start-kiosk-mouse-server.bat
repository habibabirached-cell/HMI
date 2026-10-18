@echo off
setlocal
REM Maingear host — WebSocket mouse bridge for Ideum trackpad (port 8767).
REM Visible console — do not minimize. Leave this window open during the demo.
start "KioskMouseServer" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-kiosk-mouse-server.ps1"
