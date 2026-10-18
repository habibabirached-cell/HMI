@echo off
setlocal EnableDelayedExpansion

call "%~dp0_paths.bat"
if errorlevel 1 (
  echo [ERROR] _paths.bat failed.
  pause
  exit /b 1
)

set "DCS_URL=http://localhost:3003"

echo.
echo Ideum DCS kiosk startup...
echo Repo: %REPO_ROOT%
echo.

echo [0/5] Docker prep (start engine or stop prior demo)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%prepare-demo-start.ps1" -RepoRoot "%REPO_ROOT%"
if errorlevel 1 (
  pause
  exit /b 1
)

echo [1/5] Copy Ideum cluster role config...
call "%REPO_ROOT%\ideum.copy.bat" nopause
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "%REPO_ROOT%\.env" (
  echo WARN: .env not found at %REPO_ROOT%\.env — docker compose may fail.
)

echo.
echo [2/5] Starting Docker stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-docker-compose.ps1" -RepoRoot "%REPO_ROOT%" -EnvFile "%REPO_ROOT%\.env" -ComposeFile "%REPO_ROOT%\docker-compose-dev.yml"
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  pause
  exit /b 1
)

echo.
echo [3/5] Waiting for DCS backend and UI...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%wait-for-ideum-dcs.ps1"
if errorlevel 1 (
  echo ERROR: Timed out waiting for ports 5000 / 3003.
  pause
  exit /b 1
)

echo.
echo [4/5] Opening Chrome fullscreen app at %DCS_URL% ...
call "%BAT_DIR%open-ideum-dcs-chrome.bat"
if errorlevel 1 (
  echo ERROR: Could not launch Chrome.
  pause
  exit /b 1
)

echo.
echo Done.
exit /b 0
