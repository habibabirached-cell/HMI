@echo off
setlocal EnableDelayedExpansion

echo.
echo Maingear kiosk startup...
echo.

call "%~dp0_paths.bat"
if errorlevel 1 goto :paths_failed

set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "DOCKER_LOG=%BAT_DIR%docker-compose.log"
set "PORTS_LOG=%BAT_DIR%ports-wait.log"
set "CHROME_LOG=%BAT_DIR%chrome-launch.log"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"
set "EXIT_CODE=0"

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
type "%DOCKER_LOG%"
call "%BAT_DIR%_debug-log.bat" line "docker compose exit code: !STEP_ERR! (full output in docker-compose.log)"
if !STEP_ERR! neq 0 goto :err_docker_compose

echo.
echo [2/5] Starting Vernova dev server...
call "%BAT_DIR%_debug-log.bat" line "Step 2: npm run dev in vernova-spark-engine_new"
> "%VERNOVA_DEV_LOG%" echo === Vernova dev server log ===
>> "%VERNOVA_DEV_LOG%" echo Started: %date% %time%
>> "%VERNOVA_DEV_LOG%" echo Directory: %VERNOVA_DIR%
start "Vernova dev" /MIN cmd /c "cd /d \"%VERNOVA_DIR%\" && npm run dev >> \"%VERNOVA_DEV_LOG%\" 2>&1"

echo.
echo [3/5] Waiting for ports 5000, 3003, 5173...
call "%BAT_DIR%_debug-log.bat" line "Step 3: wait for TCP ports"
> "%PORTS_LOG%" echo === Port wait log ===
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { . '%BAT_DIR%kiosk-windows.ps1'; try { Wait-ForTcpPort -Port 5000 -Label 'DCS backend'; Wait-ForTcpPort -Port 3003 -Label 'DCS UI'; Wait-ForTcpPort -Port 5173 -Label 'Vernova UI'; exit 0 } catch { Write-Error $_; exit 1 } }" >> "%PORTS_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
type "%PORTS_LOG%"
call "%BAT_DIR%_debug-log.bat" line "port wait exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_ports

echo.
echo [4/5] Opening Vernova Chrome (behind)...
call "%BAT_DIR%_debug-log.bat" line "Step 4: Vernova Chrome -NoActivate"
> "%CHROME_LOG%" echo === Chrome launch log ===
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate >> "%CHROME_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "Vernova Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_vernova_chrome

echo.
echo [5/5] Opening DCS Chrome (foreground)...
call "%BAT_DIR%_debug-log.bat" line "Step 5: DCS Chrome foreground"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs >> "%CHROME_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
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
call "%BAT_DIR%_debug-log.bat" line "ERROR: port wait failed - see ports-wait.log"
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
call "%BAT_DIR%_debug-log.bat" append-file "%CHROME_LOG%"
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
echo ============================================================
echo.

if not "!EXIT_CODE!"=="0" (
  echo Press any key to close...
  pause >nul
)

exit /b !EXIT_CODE!
