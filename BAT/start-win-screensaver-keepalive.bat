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
REM Launch the working entry script minimized (avoid nested cmd /c quoting issues).
start "winScreenSaver keepalive" /MIN "%SS_DIR%\StartWinScreenSaver.bat" nopause
exit /b 0
