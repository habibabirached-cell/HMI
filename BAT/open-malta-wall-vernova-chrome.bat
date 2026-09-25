@echo off
setlocal
call "%~dp0_paths.bat"
set "VERNOVA_URL=http://localhost:5173"
if not "%VERNOVA_KIOSK_URL%"=="" set "VERNOVA_URL=%VERNOVA_KIOSK_URL%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -Display 2 -App -Url "%VERNOVA_URL%" -SaveKioskTarget Vernova %*
