@echo off
setlocal EnableDelayedExpansion

call "%~dp0_paths.bat"
if errorlevel 1 (
  echo [ERROR] _paths.bat failed.
  exit /b 1
)

set "VERNOVA_DIR=%REPO_ROOT%\vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_URL=http://localhost:3003"

echo.
echo Genesis startup (Docker + Vernova + Chrome walls)...

where docker >nul 2>&1
if errorlevel 1 goto :err_docker

where npm >nul 2>&1
if errorlevel 1 goto :err_npm

if not exist "%VERNOVA_DIR%\package.json" goto :err_vernova_dir

if not exist "%REPO_ROOT%\.env" (
  echo WARN: .env not found at %REPO_ROOT%\.env
)

echo.
echo [0/5] Starting kiosk focus, mouse bridge, and OLED keepalive...
call "%BAT_DIR%start-kiosk-focus-server.bat"
call "%BAT_DIR%start-kiosk-mouse-server.bat"
call "%BAT_DIR%start-win-screensaver-keepalive.bat"

echo.
echo [1/5] Starting DataCenterSmartPower Docker stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-docker-compose.ps1" -RepoRoot "%REPO_ROOT%" -EnvFile "%REPO_ROOT%\.env" -ComposeFile "%REPO_ROOT%\docker-compose-dev.yml"
if errorlevel 1 goto :err_docker_compose

echo.
echo [2/5] Starting Vernova dev server (npm run dev)...
start "Vernova dev" /MIN cmd /c ""%BAT_DIR%start-vernova-dev.bat" "%VERNOVA_DIR%""
echo Vernova dev launched in minimized window. Waiting 3 seconds before port checks...
timeout /t 3 /nobreak >nul

echo.
echo [3/5] Waiting for services (ports 5000, 3003, 5173)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%wait-for-ports.ps1" -KioskWindowsScript "%BAT_DIR%kiosk-windows.ps1"
if errorlevel 1 goto :err_ports

echo.
echo [4/5] Opening Vernova Chrome (behind)...
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate
if errorlevel 1 goto :err_vernova_chrome

echo.
echo [5/5] Opening DCS Chrome (foreground)...
call "%BAT_DIR%open-dcs-chrome-4displays.bat"
if errorlevel 1 goto :err_dcs_chrome

echo.
echo Startup finished OK.
exit /b 0

:err_docker
echo ERROR: docker not found in PATH.
goto :fail

:err_npm
echo ERROR: npm not found in PATH.
goto :fail

:err_vernova_dir
echo ERROR: Vernova not found at %VERNOVA_DIR%
goto :fail

:err_docker_compose
echo ERROR: docker compose up failed.
goto :fail

:err_ports
echo ERROR: port wait failed.
goto :fail

:err_vernova_chrome
echo ERROR: Vernova Chrome launch failed.
goto :fail

:err_dcs_chrome
echo ERROR: DCS Chrome launch failed.
goto :fail

:fail
echo.
echo Press any key to close...
pause >nul
exit /b 1
