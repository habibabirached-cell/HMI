@echo off
REM Logging helpers for maingear-kiosk-start.bat (requires BAT_DIR from _paths.bat).
REM   call "%BAT_DIR%_debug-log.bat" init
REM   call "%BAT_DIR%_debug-log.bat" line your message here
REM   call "%BAT_DIR%_debug-log.bat" section Section title here
REM   call "%BAT_DIR%_debug-log.bat" append-file path\to\file.log

if "%~1"=="" goto :bad
if /i "%~1"=="init" goto :init
if /i "%~1"=="line" goto :line
if /i "%~1"=="section" goto :section
if /i "%~1"=="append-file" goto :append_file
goto :bad

:bad
echo [_debug-log.bat] Unknown command: %~1>&2
exit /b 1

:init
if not defined BAT_DIR (
  echo [_debug-log.bat] BAT_DIR is not set. Call _paths.bat first.>&2
  exit /b 1
)
set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"
> "%DEBUG_LOG%" echo === Maingear kiosk debug log ===
>> "%DEBUG_LOG%" echo Started: %date% %time%
>> "%DEBUG_LOG%" echo Computer: %COMPUTERNAME%
>> "%DEBUG_LOG%" echo User: %USERNAME%
>> "%DEBUG_LOG%" echo BAT_DIR=%BAT_DIR%
>> "%DEBUG_LOG%" echo REPO_ROOT=%REPO_ROOT%
>> "%DEBUG_LOG%" echo CD=%CD%
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo --- Tool paths ---
where docker >> "%DEBUG_LOG%" 2>&1
where npm >> "%DEBUG_LOG%" 2>&1
where node >> "%DEBUG_LOG%" 2>&1
where python >> "%DEBUG_LOG%" 2>&1
where powershell >> "%DEBUG_LOG%" 2>&1
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo --- Tool versions (errors below are OK if tool missing) ---
docker version >> "%DEBUG_LOG%" 2>&1
npm -v >> "%DEBUG_LOG%" 2>&1
node -v >> "%DEBUG_LOG%" 2>&1
python --version >> "%DEBUG_LOG%" 2>&1
powershell -NoProfile -Command "Write-Output $PSVersionTable.PSVersion" >> "%DEBUG_LOG%" 2>&1
>> "%DEBUG_LOG%" echo.
exit /b 0

:line
if not defined DEBUG_LOG set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "MSG=%~2"
echo %MSG%
>> "%DEBUG_LOG%" echo [%date% %time%] %MSG%
exit /b 0

:section
if not defined DEBUG_LOG set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "TITLE=%~2"
if "%TITLE%"=="" set "TITLE=%*"
echo.
echo --- %TITLE% ---
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo ===== %TITLE% =====
exit /b 0

:append_file
if not defined DEBUG_LOG set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "SRC=%~2"
if not exist "%SRC%" (
  >> "%DEBUG_LOG%" echo (file not found: %SRC%)
  exit /b 0
)
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo ----- contents of %SRC% -----
type "%SRC%" >> "%DEBUG_LOG%" 2>&1
>> "%DEBUG_LOG%" echo ----- end %SRC% -----
exit /b 0
