@echo off
setlocal EnableDelayedExpansion

call "%~dp0_paths.bat"
if errorlevel 1 (
  echo [ERROR] _paths.bat failed.
  exit /b 1
)

set "VERNOVA_DIR=%REPO_ROOT%\vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_TOUCH_URL=http://localhost:3003/?maltaView=touch"
set "DCS_WALL_URL=http://localhost:3003/?maltaView=wall"

echo.
echo Malta combined startup (touch + 85in wall on one PC)...
echo Repo: %REPO_ROOT%
echo.

where docker >nul 2>&1
if errorlevel 1 goto :err_docker

where npm >nul 2>&1
if errorlevel 1 goto :err_npm

if not exist "%VERNOVA_DIR%\package.json" goto :err_vernova_dir

echo [0/6] Copy Malta cluster role config...
call "%REPO_ROOT%\malta.copy.bat" nopause
if errorlevel 1 goto :fail

if not exist "%REPO_ROOT%\.env" (
  echo WARN: .env not found at %REPO_ROOT%\.env
)

echo.
echo [1/6] Starting kiosk focus and mouse servers...
call "%BAT_DIR%start-kiosk-focus-server.bat"
call "%BAT_DIR%start-kiosk-mouse-server.bat"

echo.
echo [2/6] Ensure Docker Desktop / engine is running...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%ensure-docker-desktop.ps1"
if errorlevel 1 goto :fail

echo.
echo [3/6] Starting Docker stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-docker-compose.ps1" -RepoRoot "%REPO_ROOT%" -EnvFile "%REPO_ROOT%\.env" -ComposeFile "%REPO_ROOT%\docker-compose-dev.yml"
if errorlevel 1 goto :err_docker_compose

echo.
echo [4/6] Starting Vernova dev server...
start "Vernova dev" /MIN cmd /c ""%BAT_DIR%start-vernova-dev.bat" "%VERNOVA_DIR%""
timeout /t 3 /nobreak >nul

echo.
echo [5/6] Waiting for ports 5000, 3003, 5173...
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%wait-for-ports.ps1" -KioskWindowsScript "%BAT_DIR%kiosk-windows.ps1"
if errorlevel 1 goto :err_ports

echo.
echo [6/6] Opening Chrome (touch display 1, wall display 2)...
call "%BAT_DIR%open-malta-wall-vernova-chrome.bat" -NoActivate
if errorlevel 1 goto :err_vernova_chrome

call "%BAT_DIR%open-malta-wall-dcs-chrome.bat" -NoActivate
if errorlevel 1 goto :err_dcs_chrome

call "%BAT_DIR%open-malta-touch-chrome.bat"
if errorlevel 1 goto :err_touch_chrome

echo.
echo Malta startup finished OK.
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
echo ERROR: Timed out waiting for services.
goto :fail

:err_vernova_chrome
echo ERROR: Could not open Vernova on extended display.
goto :fail

:err_dcs_chrome
echo ERROR: Could not open DCS wall on extended display.
goto :fail

:err_touch_chrome
echo ERROR: Could not open DCS touch on primary display.
goto :fail

:fail
pause
exit /b 1
