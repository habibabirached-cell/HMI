@echo off
setlocal
call "%~dp0_paths.bat"
set "SS_DIR=%REPO_ROOT%\winScreenSaver"
if not exist "%SS_DIR%\mouse_keepalive.py" (
  echo WARN: winScreenSaver not found at %SS_DIR% — skipping OLED keepalive.
  exit /b 0
)
if not exist "%SS_DIR%\StartWinScreenSaver.bat" (
  echo WARN: StartWinScreenSaver.bat not found at %SS_DIR%
  exit /b 0
)
REM Visible console — do not minimize.
start "winScreenSaver keepalive" "%SS_DIR%\StartWinScreenSaver.bat" nopause
exit /b 0
