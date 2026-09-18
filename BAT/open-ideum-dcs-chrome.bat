@echo off
setlocal
call "%~dp0_paths.bat"
REM Ideum touch table — fullscreen Chrome app for local DCS UI.
set "DCS_URL=http://localhost:3003"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" %*
