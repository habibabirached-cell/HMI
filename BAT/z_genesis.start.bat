@echo off
setlocal EnableDelayedExpansion

call "%~dp0_paths.bat"
if errorlevel 1 goto :paths_failed

set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "DOCKER_LOG=%BAT_DIR%docker-compose.log"
set "PORTS_LOG=%BAT_DIR%ports-wait.log"
set "CHROME_LOG=%BAT_DIR%chrome-launch.log"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"
set "EXIT_CODE=0"

echo.
echo Clearing old debug.txt and *.log files in BAT folder...
del /q "%BAT_DIR%debug.txt" 2>nul
del /q "%BAT_DIR%*.log" 2>nul
echo.

call "%BAT_DIR%_debug-log.bat" init
call "%BAT_DIR%_debug-log.bat" line "Genesis startup (Docker + Vernova + Chrome walls)..."
if errorlevel 1 goto :init_failed

set "VERNOVA_DIR=%REPO_ROOT%\vernova-spark-engine_new"
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

if not exist "%REPO_ROOT%\.env" (
  call "%BAT_DIR%_debug-log.bat" line "WARN: .env not found at %REPO_ROOT%\.env"
)

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "[1/5] Starting DataCenterSmartPower Docker stack..."
call "%BAT_DIR%_debug-log.bat" line "Step 1: docker compose up -d"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-docker-compose.ps1" -RepoRoot "%REPO_ROOT%" -EnvFile "%REPO_ROOT%\.env" -ComposeFile "%REPO_ROOT%\docker-compose-dev.yml" -DockerLog "%DOCKER_LOG%" -DebugLog "%DEBUG_LOG%"
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "docker compose exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_docker_compose

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "[2/5] Starting Vernova dev server (npm run dev)..."
call "%BAT_DIR%_debug-log.bat" line "Step 2: npm run dev in vernova-spark-engine_new"
call "%BAT_DIR%_debug-log.bat" line "  Output log: %VERNOVA_DEV_LOG%"
call "%BAT_DIR%_debug-log.bat" line "  This may take 1-3 minutes before port 5173 is ready."
> "%VERNOVA_DEV_LOG%" echo === Vernova dev server log ===
>> "%VERNOVA_DEV_LOG%" echo Started: %date% %time%
>> "%VERNOVA_DEV_LOG%" echo Directory: %VERNOVA_DIR%
start "Vernova dev" /MIN cmd /c ""%BAT_DIR%start-vernova-dev.bat" "%VERNOVA_DIR%" "%VERNOVA_DEV_LOG%""
call "%BAT_DIR%_debug-log.bat" line "Vernova dev launched in minimized window (title: Vernova dev)."
call "%BAT_DIR%_debug-log.bat" line "Giving Vernova 3 seconds to start before port checks..."
timeout /t 3 /nobreak >nul

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "[3/5] Waiting for services (watch this window — progress every 15s)..."
call "%BAT_DIR%_debug-log.bat" line "Step 3: wait for TCP ports 5000, 3003, 5173"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%wait-for-ports.ps1" -PortsLog "%PORTS_LOG%" -KioskWindowsScript "%BAT_DIR%kiosk-windows.ps1" -DebugLog "%DEBUG_LOG%"
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "port wait exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_ports

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "[4/5] Opening Vernova Chrome (behind)..."
call "%BAT_DIR%_debug-log.bat" line "Step 4: Vernova Chrome -NoActivate"
> "%CHROME_LOG%" echo === Chrome launch log ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-tee-exec.ps1" -LogPath "%CHROME_LOG%" -DebugLog "%DEBUG_LOG%" -CommandPath "%BAT_DIR%open-vernova-chrome-4displays.bat" -CommandArgs "-NoActivate"
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "Vernova Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_vernova_chrome

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "[5/5] Opening DCS Chrome (foreground)..."
call "%BAT_DIR%_debug-log.bat" line "Step 5: DCS Chrome — same path as open-hmi-chrome-4displays.bat"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BAT_DIR%run-tee-exec.ps1" -LogPath "%CHROME_LOG%" -DebugLog "%DEBUG_LOG%" -CommandPath "%REPO_ROOT%open-hmi-chrome-4displays.bat"
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
call "%BAT_DIR%_debug-log.bat" line "ERROR: port wait failed - see ports-wait.log and vernova-dev.log"
call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "--- vernova-dev.log ---"
if exist "%VERNOVA_DEV_LOG%" call "%BAT_DIR%_debug-log.bat" append-file "%VERNOVA_DEV_LOG%"
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
call "%BAT_DIR%_debug-log.bat" line "End of run exit code !EXIT_CODE!"

call "%BAT_DIR%_debug-log.bat" line ""
call "%BAT_DIR%_debug-log.bat" line "============================================================"
if "!EXIT_CODE!"=="0" (
  call "%BAT_DIR%_debug-log.bat" line "  Startup finished OK."
) else (
  call "%BAT_DIR%_debug-log.bat" line "  Startup FAILED."
)
call "%BAT_DIR%_debug-log.bat" line "  Summary: %DEBUG_LOG%"
call "%BAT_DIR%_debug-log.bat" line "  Docker:  %DOCKER_LOG%"
call "%BAT_DIR%_debug-log.bat" line "  Vernova: %VERNOVA_DEV_LOG%"
call "%BAT_DIR%_debug-log.bat" line "============================================================"

if not "!EXIT_CODE!"=="0" (
  call "%BAT_DIR%_debug-log.bat" line ""
  call "%BAT_DIR%_debug-log.bat" line "Press any key to close..."
  pause >nul
)

exit /b !EXIT_CODE!
