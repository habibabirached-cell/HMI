@echo off
setlocal EnableDelayedExpansion

call "%~dp0_paths.bat"
if errorlevel 1 (
  echo [ERROR] _paths.bat failed.
  pause
  exit /b 1
)

set "SRC=%REPO_ROOT%\dcs-backend\cluster.local.json.ideum"
set "DST=%REPO_ROOT%\dcs-backend\cluster.local.json"
set "DCS_URL=http://localhost:3003"

echo.
echo Ideum DCS kiosk startup...
echo Repo: %REPO_ROOT%
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: docker not found in PATH. Start Docker Desktop first.
  pause
  exit /b 1
)

echo [1/4] Copy Ideum cluster role config...
if not exist "%SRC%" (
  echo ERROR: Missing %SRC%
  pause
  exit /b 1
)
copy /Y "%SRC%" "%DST%" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy cluster.local.json
  pause
  exit /b 1
)
echo   OK: cluster.local.json is Ideum role ^(talks to Maingear at 192.168.50.1:5000^)

if not exist "%REPO_ROOT%\.env" (
  echo WARN: .env not found at %REPO_ROOT%\.env — docker compose may fail.
)

echo.
echo [2/4] Starting Docker stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-docker-compose.ps1" -RepoRoot "%REPO_ROOT%" -EnvFile "%REPO_ROOT%\.env" -ComposeFile "%REPO_ROOT%\docker-compose-dev.yml"
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  pause
  exit /b 1
)

echo.
echo [3/4] Waiting for DCS backend and UI...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%wait-for-ideum-dcs.ps1"
if errorlevel 1 (
  echo ERROR: Timed out waiting for ports 5000 / 3003.
  pause
  exit /b 1
)

echo.
echo [4/4] Opening Chrome fullscreen app at %DCS_URL% ...
call "%BAT_DIR%open-ideum-dcs-chrome.bat"
if errorlevel 1 (
  echo ERROR: Could not launch Chrome.
  pause
  exit /b 1
)

echo.
echo Done. Ideum DCS is running.
echo.
echo Note: For Ethernet to Maingear, run set-ideum-ethernet-ip.bat once as Administrator
echo       ^(sets 192.168.50.2 and writes cluster config from the network script^).
echo       This launcher uses ideum.copy ^(cluster.local.json.ideum^) only.
echo.
pause
exit /b 0
