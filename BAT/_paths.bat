@echo off
REM Sets BAT_DIR (this folder) and REPO_ROOT (parent DataCenterSmartPower repo).
REM REPO_ROOT has no trailing backslash (safe for quoted PowerShell args).
set "BAT_DIR=%~dp0"
for %%I in ("%BAT_DIR%..") do set "REPO_ROOT=%%~fI"
