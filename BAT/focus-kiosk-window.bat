@echo off
setlocal
if "%~1"=="" (
  echo Usage: focus-kiosk-window.bat Dcs^|Vernova
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0focus-kiosk-window.ps1" %1
