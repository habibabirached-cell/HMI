@echo off
REM Helpers for maingear-kiosk-start.bat — append to BAT\debug.txt
REM Usage (after _paths.bat):
REM   call "%BAT_DIR%_debug-log.bat" init
REM   call "%BAT_DIR%_debug-log.bat" line "message"
REM   call "%BAT_DIR%_debug-log.bat" section "Section title"
REM   call "%BAT_DIR%_debug-log.bat" append-file "path\to\other.log"

if /i "%~1"=="init" goto :init
if /i "%~1"=="line" goto :line
if /i "%~1"=="section" goto :section
if /i "%~1"=="append-file" goto :append_file
exit /b 1

:init
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
>> "%DEBUG_LOG%" echo --- Tool versions ---
where docker >> "%DEBUG_LOG%" 2>&1
docker version >> "%DEBUG_LOG%" 2>&1
where npm >> "%DEBUG_LOG%" 2>&1
npm -v >> "%DEBUG_LOG%" 2>&1
where node >> "%DEBUG_LOG%" 2>&1
node -v >> "%DEBUG_LOG%" 2>&1
where python >> "%DEBUG_LOG%" 2>&1
python --version >> "%DEBUG_LOG%" 2>&1
where powershell >> "%DEBUG_LOG%" 2>&1
powershell -NoProfile -Command "$PSVersionTable.PSVersion.ToString()" >> "%DEBUG_LOG%" 2>&1
>> "%DEBUG_LOG%" echo.
exit /b 0

:line
set "MSG=%~2"
echo %MSG%
>> "%DEBUG_LOG%" echo [%date% %time%] %MSG%
exit /b 0

:section
set "TITLE=%~2"
echo.
echo --- %TITLE% ---
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo ===== %TITLE% =====
exit /b 0

:append_file
set "SRC=%~2"
if not exist "%SRC%" (
  call "%BAT_DIR%_debug-log.bat" line "(file not found: %SRC%)"
  exit /b 0
)
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo ----- contents of %SRC% -----
type "%SRC%" >> "%DEBUG_LOG%" 2>&1
>> "%DEBUG_LOG%" echo ----- end %SRC% -----
exit /b 0
