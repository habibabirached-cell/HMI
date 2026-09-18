@echo off
setlocal
call "%~dp0_paths.bat"
set "DCS_URL=http://localhost:3003"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%open-ideum-dcs-chrome.ps1" -Url "%DCS_URL%" %*
