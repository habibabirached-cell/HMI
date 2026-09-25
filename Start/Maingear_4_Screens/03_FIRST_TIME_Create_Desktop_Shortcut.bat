@echo off
setlocal
call "%~dp0..\_repo-root.bat"

set "TARGET=%~dp0START_Daily_Genesis_4_Screens.bat"
set "LINK=%USERPROFILE%\Desktop\Genesis 4-Screen Wall.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%REPO_ROOT%';" ^
  "$s.Description = 'Maingear: Docker + Vernova + DCS 4-display kiosk';" ^
  "$s.Save()"

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
