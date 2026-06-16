@echo off
setlocal
set "SRC=%~dp0dcs-backend\cluster.local.json.ideum"
set "DST=%~dp0dcs-backend\cluster.local.json"

if not exist "%SRC%" (
    echo ERROR: Source file not found:
    echo   %SRC%
    pause
    exit /b 1
)

copy /Y "%SRC%" "%DST%" >nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy cluster config.
    pause
    exit /b 1
)

echo Copied Ideum cluster config:
echo   %SRC%
echo to:
echo   %DST%
pause
