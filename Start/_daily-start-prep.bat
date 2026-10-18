@echo off
setlocal EnableDelayedExpansion
REM Run 01 then 02 from Start\<platform>\ (pass that folder as %1 from START_Daily_*.bat)
set "HERE=%~1"
if not defined HERE set "HERE=%~dp0"
if "%HERE:~-1%" neq "\" set "HERE=%HERE%\"

for %%F in ("%HERE%01_*.bat") do (
  echo.
  echo === Daily prep: %%~nxF ===
  call "%%F"
  if errorlevel 1 exit /b 1
  goto :after01
)
echo WARN: No 01_FIRST_TIME*.bat found in %HERE%
:after01

for %%F in ("%HERE%02_*.bat") do (
  echo.
  echo === Daily prep: %%~nxF ===
  echo %%~nxF | findstr /i "Ethernet" >nul
  if !errorlevel! equ 0 (
    call "%HERE%..\_run-ethernet-setup-elevated.bat" "%%F"
  ) else (
    call "%%F" nopause
  )
  if errorlevel 1 exit /b 1
  goto :after02
)
echo WARN: No 02_FIRST_TIME*.bat found in %HERE%
:after02
exit /b 0
