@echo off
setlocal
set "STEP=%~1"
if not exist "%STEP%" (
  echo ERROR: Ethernet setup batch not found: %STEP%
  exit /b 1
)

net session >nul 2>&1
if %errorlevel% equ 0 (
  call "%STEP%" nopause
  exit /b %errorlevel%
)

echo Requesting Administrator approval for cluster Ethernet setup...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$code = (Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'call \"\"\"%STEP%\"\"\" nopause') -Verb RunAs -PassThru -Wait).ExitCode; exit $code"
exit /b %errorlevel%
