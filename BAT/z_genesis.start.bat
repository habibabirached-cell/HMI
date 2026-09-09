@echo off
setlocal EnableDelayedExpansion

echo.
echo Genesis startup (Docker + Vernova + Chrome walls)...
echo.

call "%~dp0_paths.bat"
if errorlevel 1 goto :paths_failed

set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "DOCKER_LOG=%BAT_DIR%docker-compose.log"
set "PORTS_LOG=%BAT_DIR%ports-wait.log"
set "CHROME_LOG=%BAT_DIR%chrome-launch.log"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"
set "EXIT_CODE=0"

echo Clearing old debug.txt and *.log files in BAT folder...
del /q "%BAT_DIR%debug.txt" 2>nul
del /q "%BAT_DIR%*.log" 2>nul
echo.

call "%BAT_DIR%_debug-log.bat" init
if errorlevel 1 goto :init_failed

set "VERNOVA_DIR=%REPO_ROOT%vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_URL=http://localhost:3003"

call "%BAT_DIR%_debug-log.bat" line "VERNOVA_DIR=%VERNOVA_DIR%"
call "%BAT_DIR%_debug-log.bat" line "DCS_URL=%DCS_URL%"
call "%BAT_DIR%_debug-log.bat" line "Sub-logs: docker-compose.log ports-wait.log chrome-launch.log vernova-dev.log"

where docker >nul 2>&1
if errorlevel 1 goto :err_docker

where npm >nul 2>&1
if errorlevel 1 goto :err_npm

if not exist "%VERNOVA_DIR%\package.json" goto :err_vernova_dir

if not exist "%REPO_ROOT%.env" (
  call "%BAT_DIR%_debug-log.bat" line "WARN: .env not found at %REPO_ROOT%.env"
)

echo.
echo [1/5] Starting DataCenterSmartPower Docker stack...
call "%BAT_DIR%_debug-log.bat" line "Step 1: docker compose up -d"
pushd "%REPO_ROOT%"
docker compose --env-file "%REPO_ROOT%.env" -f "%REPO_ROOT%docker-compose-dev.yml" up -d > "%DOCKER_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
echo. >> "%DOCKER_LOG%"
echo --- docker compose ps --- >> "%DOCKER_LOG%"
docker compose --env-file "%REPO_ROOT%.env" -f "%REPO_ROOT%docker-compose-dev.yml" ps >> "%DOCKER_LOG%" 2>&1
popd
echo --- docker-compose.log ---
type "%DOCKER_LOG%"
echo ---
call "%BAT_DIR%_debug-log.bat" line "docker compose exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_docker_compose

echo.
echo [2/5] Starting Vernova dev server (npm run dev)...
call "%BAT_DIR%_debug-log.bat" line "Step 2: npm run dev in vernova-spark-engine_new"
echo   Output log: %VERNOVA_DEV_LOG%
echo   This may take 1-3 minutes before port 5173 is ready.
> "%VERNOVA_DEV_LOG%" echo === Vernova dev server log ===
>> "%VERNOVA_DEV_LOG%" echo Started: %date% %time%
>> "%VERNOVA_DEV_LOG%" echo Directory: %VERNOVA_DIR%
start "Vernova dev" /MIN cmd /c ""%BAT_DIR%start-vernova-dev.bat" "%VERNOVA_DIR%" "%VERNOVA_DEV_LOG%""
call "%BAT_DIR%_debug-log.bat" line "Vernova dev launched in minimized window (title: Vernova dev)."

echo.
echo [3/5] Waiting for services (watch this window — progress every 15s)...
call "%BAT_DIR%_debug-log.bat" line "Step 3: wait for TCP ports 5000, 3003, 5173"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$log='%PORTS_LOG%'; Start-Transcript -LiteralPath $log -Force ^| Out-Null; " ^
  "try { . '%BAT_DIR%kiosk-windows.ps1'; " ^
  "  Wait-ForTcpPort -Port 5000 -Label 'DCS backend (Docker)'; " ^
  "  Wait-ForTcpPort -Port 3003 -Label 'DCS UI (Docker)'; " ^
  "  Wait-ForTcpPort -Port 5173 -Label 'Vernova npm run dev (Vite on port 5173)' -TimeoutSeconds 300; " ^
  "  exit 0 " ^
  "} catch { Write-Host $_.Exception.Message; exit 1 } " ^
  "finally { Stop-Transcript ^| Out-Null }"
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "port wait exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_ports

echo.
echo [4/5] Opening Vernova Chrome (behind)...
call "%BAT_DIR%_debug-log.bat" line "Step 4: Vernova Chrome -NoActivate"
> "%CHROME_LOG%" echo === Chrome launch log ===
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate >> "%CHROME_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
type "%CHROME_LOG%"
call "%BAT_DIR%_debug-log.bat" line "Vernova Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_vernova_chrome

echo.
echo [5/5] Opening DCS Chrome (foreground)...
call "%BAT_DIR%_debug-log.bat" line "Step 5: DCS Chrome foreground"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs >> "%CHROME_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
type "%CHROME_LOG%"
call "%BAT_DIR%_debug-log.bat" line "DCS Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_dcs_chrome

call "%BAT_DIR%_debug-log.bat" line "Startup finished OK."
set "EXIT_CODE=0"
goto :finish

:paths_failed
echo [ERROR] _paths.bat failed.
set "EXIT_CODE=1"
goto :finish

:init_failed
echo [ERROR] debug log init failed.
set "EXIT_CODE=1"
goto :finish

:err_docker
call "%BAT_DIR%_debug-log.bat" line "ERROR: docker not found in PATH."
set "EXIT_CODE=1"
goto :finish

:err_npm
call "%BAT_DIR%_debug-log.bat" line "ERROR: npm not found in PATH."
set "EXIT_CODE=1"
goto :finish

:err_vernova_dir
call "%BAT_DIR%_debug-log.bat" line "ERROR: Vernova not found at %VERNOVA_DIR%"
set "EXIT_CODE=1"
goto :finish

:err_docker_compose
call "%BAT_DIR%_debug-log.bat" line "ERROR: docker compose up failed - see docker-compose.log"
set "EXIT_CODE=1"
goto :finish

:err_ports
call "%BAT_DIR%_debug-log.bat" line "ERROR: port wait failed - see ports-wait.log and vernova-dev.log"
echo.
echo --- vernova-dev.log (tail) ---
if exist "%VERNOVA_DEV_LOG%" type "%VERNOVA_DEV_LOG%"
echo ---
set "EXIT_CODE=1"
goto :finish

:err_vernova_chrome
call "%BAT_DIR%_debug-log.bat" line "ERROR: Vernova Chrome failed - see chrome-launch.log"
set "EXIT_CODE=1"
goto :finish

:err_dcs_chrome
call "%BAT_DIR%_debug-log.bat" line "ERROR: DCS Chrome failed - see chrome-launch.log"
set "EXIT_CODE=1"
goto :finish

:finish
call "%BAT_DIR%_debug-log.bat" append-file "%DOCKER_LOG%"
call "%BAT_DIR%_debug-log.bat" append-file "%PORTS_LOG%"
if exist "%CHROME_LOG%" call "%BAT_DIR%_debug-log.bat" append-file "%CHROME_LOG%"
call "%BAT_DIR%_debug-log.bat" append-file "%VERNOVA_DEV_LOG%"
call "%BAT_DIR%_debug-log.bat" line "End of run exit code !EXIT_CODE!"

echo.
echo ============================================================
if "!EXIT_CODE!"=="0" (
  echo   Startup finished OK.
) else (
  echo   Startup FAILED.
)
echo   Summary: %DEBUG_LOG%
echo   Docker:  %DOCKER_LOG%
echo   Vernova: %VERNOVA_DEV_LOG%
echo ============================================================
echo.
echo --- debug.txt summary ---
if exist "%DEBUG_LOG%" type "%DEBUG_LOG%"
echo --- end debug.txt ---

if not "!EXIT_CODE!"=="0" (
  echo.
  echo Press any key to close...
  pause >nul
)

exit /b !EXIT_CODE!
