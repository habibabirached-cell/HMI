@echo off
setlocal
call "%~dp0_paths.bat"
REM Same launch as repo-root open-hmi-chrome-4displays.bat (default Chrome profile = gray title bar).
REM Do NOT pass -SaveKioskTarget here — the separate kiosk profile gets a cyan Windows accent bar.
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -SpanAllDisplays -App -Url "http://localhost:3003" %*
