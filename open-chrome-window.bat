@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-chrome-window.ps1" %*
