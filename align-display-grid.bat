@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0align-display-grid.ps1" %*
