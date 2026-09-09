@echo off
REM Logging helpers for z_genesis.start.bat (requires BAT_DIR from _paths.bat).
REM Every write goes to the console AND debug.txt.
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

:mirror
echo %~1
>> "%DEBUG_LOG%" echo %~1
exit /b 0

:mirror_run
echo.
echo --- %* ---
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo --- %* ---
call %* > "%TEMP%\genesis-debug.out" 2>&1
type "%TEMP%\genesis-debug.out"
type "%TEMP%\genesis-debug.out" >> "%DEBUG_LOG%"
del "%TEMP%\genesis-debug.out" 2>nul
exit /b 0

:init
if not defined BAT_DIR (
  echo [_debug-log.bat] BAT_DIR is not set. Call _paths.bat first.>&2
  exit /b 1
)
set "DEBUG_LOG=%BAT_DIR%debug.txt"
set "VERNOVA_DEV_LOG=%BAT_DIR%vernova-dev.log"
> "%DEBUG_LOG%" echo === Maingear kiosk debug log ===
call :mirror "Started: %date% %time%"
call :mirror "Computer: %COMPUTERNAME%"
call :mirror "User: %USERNAME%"
call :mirror "BAT_DIR=%BAT_DIR%"
call :mirror "REPO_ROOT=%REPO_ROOT%"
call :mirror "CD=%CD%"
echo.
>> "%DEBUG_LOG%" echo.
call :mirror "--- Tool paths ---"
call :mirror_run where docker
call :mirror_run where npm
call :mirror_run where node
call :mirror_run where python
call :mirror_run where powershell
echo.
>> "%DEBUG_LOG%" echo.
call :mirror "--- Tool versions (errors below are OK if tool missing) ---"
call :mirror_run docker version
call :mirror_run npm -v
call :mirror_run node -v
call :mirror_run python --version
call :mirror_run powershell -NoProfile -Command "Write-Output $PSVersionTable.PSVersion"
echo.
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
  echo (file not found: %SRC%)
  >> "%DEBUG_LOG%" echo (file not found: %SRC%)
  exit /b 0
)
echo.
echo ----- contents of %SRC% -----
>> "%DEBUG_LOG%" echo.
>> "%DEBUG_LOG%" echo ----- contents of %SRC% -----
type "%SRC%"
type "%SRC%" >> "%DEBUG_LOG%" 2>&1
echo ----- end %SRC% -----
>> "%DEBUG_LOG%" echo ----- end %SRC% -----
exit /b 0
