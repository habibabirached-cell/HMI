@echo off
setlocal
REM Maingear host — WebSocket mouse bridge for Ideum trackpad (port 8767).
start "KioskMouseServer" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-kiosk-mouse-server.ps1"
