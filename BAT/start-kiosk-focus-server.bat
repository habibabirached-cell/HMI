@echo off
setlocal
REM Ideum -> Maingear kiosk focus listener (port 8766).
REM Visible console — do not minimize. Leave this window open during the demo.
start "KioskFocusServer" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kiosk-focus-server.ps1"
