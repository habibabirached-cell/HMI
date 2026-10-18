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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0elevate-batch.ps1" -BatchPath "%STEP%" -BatchArgs nopause
exit /b %errorlevel%
