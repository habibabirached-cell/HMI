@echo off
setlocal EnableDelayedExpansion
call "%~dp0_paths.bat"
REM Maingear demo startup: DCS Docker + Vernova dev server + two fullscreen Chrome windows.
REM   Front:  http://localhost:3003  (DataCenterSmartPower)
REM   Back:   http://localhost:5173  (Vernova Spark Engine, preloaded)

set "VERNOVA_DIR=%REPO_ROOT%vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_URL=http://localhost:3003"

echo ============================================================
echo   Maingear kiosk startup
echo ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] docker not found in PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found in PATH.
  exit /b 1
)

if not exist "%VERNOVA_DIR%\package.json" (
  echo [ERROR] Vernova project not found at %VERNOVA_DIR%
  exit /b 1
)

echo [1/5] Starting DataCenterSmartPower Docker stack...
pushd "%REPO_ROOT%"
docker compose --env-file "%REPO_ROOT%.env" -f "%REPO_ROOT%docker-compose-dev.yml" up -d
if errorlevel 1 (
  echo [ERROR] docker compose up failed.
  popd
  exit /b 1
)
popd

echo [2/5] Starting Vernova dev server in background...
start "Vernova dev" /MIN cmd /c "cd /d \"%VERNOVA_DIR%\" && npm run dev"

echo [3/5] Waiting for backend/UI ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  ". '%BAT_DIR%kiosk-windows.ps1'; Wait-ForTcpPort -Port 5000 -Label 'DCS backend'; Wait-ForTcpPort -Port 3003 -Label 'DCS UI'; Wait-ForTcpPort -Port 5173 -Label 'Vernova UI'"
if errorlevel 1 (
  echo [ERROR] Timed out waiting for services. Check Docker and Vernova logs.
  exit /b 1
)

echo [4/5] Opening Vernova Chrome behind (preloaded)...
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate
if errorlevel 1 (
  echo [ERROR] Vernova Chrome launch failed.
  exit /b 1
)

echo [5/5] Opening DCS Chrome on top...
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs
if errorlevel 1 (
  echo [ERROR] DCS Chrome launch failed.
  exit /b 1
)

echo.
echo Done.
echo   Front wall: %DCS_URL%
echo   Back wall:  %VERNOVA_URL%  (preloaded)
echo.
echo Test window swap:
echo   BAT\maingear-kiosk-focus-vernova.bat
echo   BAT\maingear-kiosk-focus-dcs.bat
echo.
exit /b 0
