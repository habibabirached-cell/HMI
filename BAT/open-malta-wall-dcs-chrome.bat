@echo off
setlocal
call "%~dp0_paths.bat"
set "DCS_WALL_URL=http://localhost:3003/?maltaView=wall"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -Display 2 -App -Url "%DCS_WALL_URL%" -SaveKioskTarget Dcs %*
