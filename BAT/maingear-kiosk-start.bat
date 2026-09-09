@echo off
setlocal EnableDelayedExpansion

REM Always show something first (double-click closes window on exit otherwise).
echo.
echo Maingear kiosk startup...
echo.

call "%~dp0_paths.bat"
if errorlevel 1 goto :paths_failed

set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"

call "%BAT_DIR%_debug-log.bat" init
if errorlevel 1 goto :init_failed

set "VERNOVA_DIR=%REPO_ROOT%vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_URL=http://localhost:3003"
set "EXIT_CODE=0"

call "%BAT_DIR%_debug-log.bat" section "Maingear kiosk startup"
call "%BAT_DIR%_debug-log.bat" line "VERNOVA_DIR=%VERNOVA_DIR%"
call "%BAT_DIR%_debug-log.bat" line "DCS_URL=%DCS_URL%"

where docker >nul 2>&1
if errorlevel 1 goto :err_docker

where npm >nul 2>&1
if errorlevel 1 goto :err_npm

if not exist "%VERNOVA_DIR%\package.json" goto :err_vernova_dir

if not exist "%REPO_ROOT%.env" (
  call "%BAT_DIR%_debug-log.bat" line "WARN: .env not found at %REPO_ROOT%.env"
)

call "%BAT_DIR%_debug-log.bat" section "Step 1 of 5 - Docker compose up"
pushd "%REPO_ROOT%"
docker compose --env-file "%REPO_ROOT%.env" -f "%REPO_ROOT%docker-compose-dev.yml" up -d >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
popd
call "%BAT_DIR%_debug-log.bat" line "docker compose exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_docker_compose

call "%BAT_DIR%_debug-log.bat" section "Step 2 of 5 - Vernova npm run dev"
> "%VERNOVA_DEV_LOG%" echo === Vernova dev server log ===
>> "%VERNOVA_DEV_LOG%" echo Started: %date% %time%
>> "%VERNOVA_DEV_LOG%" echo Directory: %VERNOVA_DIR%
call "%BAT_DIR%_debug-log.bat" line "Logging Vernova output to %VERNOVA_DEV_LOG%"
start "Vernova dev" /MIN cmd /c "cd /d \"%VERNOVA_DIR%\" && npm run dev >> \"%VERNOVA_DEV_LOG%\" 2>&1"
call "%BAT_DIR%_debug-log.bat" line "Vernova dev launched in minimized window."

call "%BAT_DIR%_debug-log.bat" section "Step 3 of 5 - Wait for ports 5000, 3003, 5173"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { . '%BAT_DIR%kiosk-windows.ps1'; try { Wait-ForTcpPort -Port 5000 -Label 'DCS backend'; Wait-ForTcpPort -Port 3003 -Label 'DCS UI'; Wait-ForTcpPort -Port 5173 -Label 'Vernova UI'; exit 0 } catch { Write-Error $_; exit 1 } }" >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "port wait exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_ports

call "%BAT_DIR%_debug-log.bat" section "Step 4 of 5 - Vernova Chrome behind"
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "Vernova Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 goto :err_vernova_chrome

call "%BAT_DIR%_debug-log.bat" section "Step 5 of 5 - DCS Chrome foreground"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs >> "%DEBUG_LOG%" 2>&1
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
echo [ERROR] debug log init failed. Check BAT\_debug-log.bat exists.
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
call "%BAT_DIR%_debug-log.bat" line "ERROR: docker compose up failed."
set "EXIT_CODE=1"
goto :finish

:err_ports
call "%BAT_DIR%_debug-log.bat" line "ERROR: timed out waiting for a service port."
set "EXIT_CODE=1"
goto :finish

:err_vernova_chrome
call "%BAT_DIR%_debug-log.bat" line "ERROR: Vernova Chrome launch failed."
set "EXIT_CODE=1"
goto :finish

:err_dcs_chrome
call "%BAT_DIR%_debug-log.bat" line "ERROR: DCS Chrome launch failed."
set "EXIT_CODE=1"
goto :finish

:finish
if defined VERNOVA_DEV_LOG call "%BAT_DIR%_debug-log.bat" append-file "%VERNOVA_DEV_LOG%"
if defined DEBUG_LOG (
  call "%BAT_DIR%_debug-log.bat" section "End of log"
  echo.
  echo ============================================================
  if "!EXIT_CODE!"=="0" (
    echo   Startup finished OK.
  ) else (
    echo   Startup FAILED.
  )
  echo   Log file: %DEBUG_LOG%
  echo ============================================================
  echo.
  type "%DEBUG_LOG%"
  echo.
) else (
  echo [ERROR] No debug log was created.
)

if not "!EXIT_CODE!"=="0" (
  echo Press any key to close this window...
  pause >nul
)

exit /b !EXIT_CODE!
