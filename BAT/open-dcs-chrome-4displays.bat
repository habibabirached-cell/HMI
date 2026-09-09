@echo off
setlocal
call "%~dp0_paths.bat"
REM DataCenterSmartPower HMI — 4-display Chrome app (foreground at genesis startup).
set "DCS_URL=http://localhost:3003"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs %*
