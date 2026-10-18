@echo off
setlocal
set "NO_PAUSE=0"
set "DAILY=0"
if /i "%~1"=="nopause" set "NO_PAUSE=1"
if /i "%~1"=="daily" set "DAILY=1" & set "NO_PAUSE=1"
if /i "%~2"=="daily" set "DAILY=1"
if /i "%~2"=="nopause" set "NO_PAUSE=1"

if "%DAILY%"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-direct-ethernet-ip.ps1" -IpAddress 192.168.50.1 -Daily
  exit /b %errorlevel%
)

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    if "%NO_PAUSE%"=="1" (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList 'nopause' -Verb RunAs -Wait"
    ) else (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    )
    exit /b %errorlevel%
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-direct-ethernet-ip.ps1" -IpAddress 192.168.50.1
if "%NO_PAUSE%"=="0" pause
