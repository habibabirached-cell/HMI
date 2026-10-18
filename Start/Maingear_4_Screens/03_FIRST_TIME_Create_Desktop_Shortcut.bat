@echo off
setlocal
call "%~dp0..\_repo-root.bat"

set "TARGET=%~dp0START_Daily_Genesis_4_Screens.bat"
set "LINK=%USERPROFILE%\Desktop\Genesis 4-Screen Wall.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\create-desktop-shortcut.ps1" ^
  -LinkPath "%LINK%" ^
  -TargetPath "%TARGET%" ^
  -WorkingDirectory "%REPO_ROOT%" ^
  -Description "Maingear Genesis 4-screen daily start"

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
