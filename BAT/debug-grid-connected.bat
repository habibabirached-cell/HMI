@echo off
setlocal EnableDelayedExpansion
REM Step-by-step debug for Ideum "Grid Connected" -> Maingear Vernova wall focus.
call "%~dp0_paths.bat"
if errorlevel 1 exit /b 1

set "FOCUS_URL=http://127.0.0.1:8766/kiosk/focus/Vernova"
set "API_URL=http://127.0.0.1:5000/api/cluster/remote-command"
set "ROLE_URL=http://127.0.0.1:5000/api/cluster/machine-role"
set "LOG=%BAT_DIR%debug-grid-connected.txt"

echo === Grid Connected debug === > "%LOG%"
echo Time: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

echo.
echo [1/4] Machine role (Maingear backend)...
echo --- GET %ROLE_URL% --- >> "%LOG%"
curl -s "%ROLE_URL%" >> "%LOG%" 2>&1
echo. >> "%LOG%"
curl -s "%ROLE_URL%"
echo.
echo.

echo [2/4] Kiosk focus server on port 8766 (host)...
echo --- POST %FOCUS_URL% --- >> "%LOG%"
curl -s -X POST "%FOCUS_URL%" -H "Content-Type: application/json" -d "{}" >> "%LOG%" 2>&1
echo. >> "%LOG%"
curl -s -X POST "%FOCUS_URL%" -H "Content-Type: application/json" -d "{}"
echo.
echo.
echo   If step 2 fails: run BAT\start-kiosk-focus-server.bat (or z_genesis.start.bat)
echo.

echo [3/4] Backend remote-command showVernova (Docker -^> host focus)...
echo --- POST %API_URL% showVernova --- >> "%LOG%"
curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"command\":\"showVernova\",\"source\":\"debug\"}" >> "%LOG%" 2>&1
echo. >> "%LOG%"
curl -s -X POST "%API_URL%" -H "Content-Type: application/json" -d "{\"command\":\"showVernova\",\"source\":\"debug\"}"
echo.
echo.
echo   If step 3 says Invalid command: restart Docker backend (pull latest, docker compose up -d)
echo   If step 3 says 503 / connection refused: focus server not reachable from Docker
echo.

echo [4/4] Saved kiosk window registry...
if exist "%BAT_DIR%kiosk-windows.json" (
  type "%BAT_DIR%kiosk-windows.json"
  type "%BAT_DIR%kiosk-windows.json" >> "%LOG%"
) else (
  echo kiosk-windows.json missing — run z_genesis.start.bat first
  echo kiosk-windows.json missing >> "%LOG%"
)
echo.
echo Full log: %LOG%
pause
