@echo off
setlocal
call "%~dp0_paths.bat"
if errorlevel 1 exit /b 1

set "TARGET=%REPO_ROOT%\ideum-start-kiosk.bat"
set "LINK=%USERPROFILE%\Desktop\Ideum DCS Kiosk.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%REPO_ROOT%';" ^
  "$s.Description = 'Ideum: cluster role + Docker + DCS fullscreen';" ^
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
