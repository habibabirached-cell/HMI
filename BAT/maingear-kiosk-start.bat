@echo off
setlocal EnableDelayedExpansion
call "%~dp0_paths.bat"
call "%BAT_DIR%_debug-log.bat" init

set "VERNOVA_DIR=%REPO_ROOT%vernova-spark-engine_new"
set "VERNOVA_URL=http://localhost:5173"
set "DCS_URL=http://localhost:3003"
set "EXIT_CODE=0"

call "%BAT_DIR%_debug-log.bat" section "Maingear kiosk startup"
call "%BAT_DIR%_debug-log.bat" line "VERNOVA_DIR=%VERNOVA_DIR%"
call "%BAT_DIR%_debug-log.bat" line "VERNOVA_URL=%VERNOVA_URL%"
call "%BAT_DIR%_debug-log.bat" line "DCS_URL=%DCS_URL%"

where docker >nul 2>&1
if errorlevel 1 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] docker not found in PATH."
  set "EXIT_CODE=1"
  goto :finish
)

where npm >nul 2>&1
if errorlevel 1 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] npm not found in PATH."
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%VERNOVA_DIR%\package.json" (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] Vernova project not found at %VERNOVA_DIR%"
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%REPO_ROOT%.env" (
  call "%BAT_DIR%_debug-log.bat" line "[WARN] .env not found at %REPO_ROOT%.env"
)

call "%BAT_DIR%_debug-log.bat" section "[1/5] Docker compose up"
pushd "%REPO_ROOT%"
call "%BAT_DIR%_debug-log.bat" line "RUN: docker compose --env-file .env -f docker-compose-dev.yml up -d"
docker compose --env-file "%REPO_ROOT%.env" -f "%REPO_ROOT%docker-compose-dev.yml" up -d >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "docker compose exit code: !STEP_ERR!"
popd
if !STEP_ERR! neq 0 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] docker compose up failed."
  set "EXIT_CODE=1"
  goto :finish
)

call "%BAT_DIR%_debug-log.bat" section "[2/5] Vernova npm run dev"
> "%VERNOVA_DEV_LOG%" echo === Vernova dev server log ===
>> "%VERNOVA_DEV_LOG%" echo Started: %date% %time%
>> "%VERNOVA_DEV_LOG%" echo Directory: %VERNOVA_DIR%
call "%BAT_DIR%_debug-log.bat" line "Vernova stdout/stderr -> %VERNOVA_DEV_LOG%"
call "%BAT_DIR%_debug-log.bat" line "RUN: start /MIN cmd /c cd %VERNOVA_DIR% ^&^& npm run dev"
start "Vernova dev" /MIN cmd /c "cd /d \"%VERNOVA_DIR%\" && npm run dev >> \"%VERNOVA_DEV_LOG%\" 2>&1"
call "%BAT_DIR%_debug-log.bat" line "Vernova dev process launched (minimized window titled 'Vernova dev')."

call "%BAT_DIR%_debug-log.bat" section "[3/5] Wait for TCP ports 5000, 3003, 5173"
call "%BAT_DIR%_debug-log.bat" line "RUN: Wait-ForTcpPort (PowerShell)"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  ". '%BAT_DIR%kiosk-windows.ps1'; try { Wait-ForTcpPort -Port 5000 -Label 'DCS backend'; Wait-ForTcpPort -Port 3003 -Label 'DCS UI'; Wait-ForTcpPort -Port 5173 -Label 'Vernova UI'; exit 0 } catch { Write-Error $_; exit 1 }" >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "port wait exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] Timed out waiting for services."
  call "%BAT_DIR%_debug-log.bat" append-file "%VERNOVA_DEV_LOG%"
  set "EXIT_CODE=1"
  goto :finish
)

call "%BAT_DIR%_debug-log.bat" section "[4/5] Vernova Chrome (behind, -NoActivate)"
call "%BAT_DIR%_debug-log.bat" line "RUN: open-vernova-chrome-4displays.bat -NoActivate"
call "%BAT_DIR%open-vernova-chrome-4displays.bat" -NoActivate >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "Vernova Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] Vernova Chrome launch failed."
  set "EXIT_CODE=1"
  goto :finish
)

call "%BAT_DIR%_debug-log.bat" section "[5/5] DCS Chrome (foreground)"
call "%BAT_DIR%_debug-log.bat" line "RUN: open-chrome-window.ps1 -SpanAllDisplays -App -Url %DCS_URL% -SaveKioskTarget Dcs"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%open-chrome-window.ps1" -SpanAllDisplays -App -Url "%DCS_URL%" -SaveKioskTarget Dcs >> "%DEBUG_LOG%" 2>&1
set "STEP_ERR=!errorlevel!"
call "%BAT_DIR%_debug-log.bat" line "DCS Chrome exit code: !STEP_ERR!"
if !STEP_ERR! neq 0 (
  call "%BAT_DIR%_debug-log.bat" line "[ERROR] DCS Chrome launch failed."
  set "EXIT_CODE=1"
  goto :finish
)

call "%BAT_DIR%_debug-log.bat" line "Done. Front=%DCS_URL% Back=%VERNOVA_URL%"
goto :finish

:finish
call "%BAT_DIR%_debug-log.bat" append-file "%VERNOVA_DEV_LOG%"
call "%BAT_DIR%_debug-log.bat" section "End of log (exit code !EXIT_CODE!)"
echo.
echo ============================================================
if !EXIT_CODE! equ 0 (
  echo   Startup finished OK.
) else (
  echo   Startup FAILED — see log below and BAT\debug.txt
)
echo   Log file: %DEBUG_LOG%
echo ============================================================
echo.
type "%DEBUG_LOG%"
echo.
exit /b !EXIT_CODE!
