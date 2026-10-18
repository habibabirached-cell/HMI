@echo off
setlocal
set "NO_PAUSE=0"
if /i "%~1"=="nopause" set "NO_PAUSE=1"
call "%~dp0..\_repo-root.bat"

set "TARGET=%~dp0START_Daily_Ideum_Malta_Kiosk.bat"
set "LINK=%USERPROFILE%\Desktop\Ideum DCS Kiosk (Malta).lnk"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\create-desktop-shortcut.ps1" ^
  -LinkPath "%LINK%" ^
  -TargetPath "%TARGET%" ^
  -WorkingDirectory "%REPO_ROOT%" ^
  -Description "Ideum Malta daily start"

if errorlevel 1 (
  echo Failed to create desktop shortcut.
  pause
  exit /b 1
)

echo Created desktop shortcut:
echo   %LINK%
echo Target:
echo   %TARGET%
if "%NO_PAUSE%"=="0" pause
