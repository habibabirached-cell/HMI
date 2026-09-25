@echo off
setlocal
set "SRC=%~dp0dcs-backend\cluster.local.json.malta"
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

echo Copied Malta combined cluster config:
echo   %SRC%
echo to:
echo   %DST%
if /i not "%~1"=="nopause" pause
