@echo off
call "%~dp0..\_repo-root.bat"
call "%~dp0..\_daily-start-prep.bat" "%~dp0"
if errorlevel 1 (
  pause
  exit /b 1
)
cd /d "%REPO_ROOT%"
call "%REPO_ROOT%\BAT\z_genesis.start.bat"

REM RSCAD driver is a Windows process on this PC (talks to RTDS). Not inside Docker.
REM CAD_Driver is a sibling repo: DataCenterCode\CAD_Driver, next to DataCenterSmartPower.
REM If it is already up, close that console and start a new visible one. Never minimize it.
echo.
echo RSCAD driver server (port 8008)...
for %%I in ("%REPO_ROOT%\..\CAD_Driver\rscad-driver-svc") do set "RSCAD_SVC_DIR=%%~fI"
if not exist "%RSCAD_SVC_DIR%\run_rscad_server.bat" (
  echo ERROR: RSCAD server bat not found under %RSCAD_SVC_DIR%
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\BAT\restart-rscad-server.ps1" -RepoRoot "%REPO_ROOT%"
echo Starting RSCAD driver server in a visible window...
start "RSCAD server" /D "%RSCAD_SVC_DIR%" cmd /k run_rscad_server.bat
