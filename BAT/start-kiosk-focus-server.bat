@echo off
setlocal
REM Background listener for Ideum -> Maingear kiosk focus (port 8766).
start "KioskFocusServer" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kiosk-focus-server.ps1"
