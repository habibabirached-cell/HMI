@echo off
setlocal
call "%~dp0_paths.bat"
set "DCS_TOUCH_URL=http://localhost:3003/?maltaView=touch"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -Display 1 -App -Url "%DCS_TOUCH_URL%" -SaveKioskTarget Dcs %*
