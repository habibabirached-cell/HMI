@echo off
setlocal
REM Opens Chrome in app mode across all monitors (auto-detects layout).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-chrome-window.ps1" -SpanAllDisplays -App -Url "http://localhost:3003"
