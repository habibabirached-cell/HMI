@echo off
setlocal
call "%~dp0..\_repo-root.bat"

set "TARGET=%~dp0START_Daily_Ideum_CXC_Kiosk.bat"
set "LINK=%USERPROFILE%\Desktop\Ideum DCS Kiosk.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%REPO_ROOT%';" ^
  "$s.Description = 'Ideum CXC: cluster + Docker + DCS fullscreen';" ^
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
