@echo off
setlocal
call "%~dp0_paths.bat"
if errorlevel 1 exit /b 1

set "TARGET=%REPO_ROOT%\Start\Ideum_CXC\START_Daily_Ideum_CXC_Kiosk.bat"
set "LINK=%USERPROFILE%\Desktop\Ideum DCS Kiosk.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\Start\create-desktop-shortcut.ps1" ^
  -LinkPath "%LINK%" ^
  -TargetPath "%TARGET%" ^
  -WorkingDirectory "%REPO_ROOT%" ^
  -Description "Ideum CXC daily start"

if errorlevel 1 (
  echo Failed to create desktop shortcut.
  pause
  exit /b 1
)

echo Created desktop shortcut:
echo   %LINK%
echo Target: 
echo   %TARGET%
pause
