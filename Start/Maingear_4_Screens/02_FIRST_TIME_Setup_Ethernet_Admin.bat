@echo off
call "%~dp0..\_repo-root.bat"
cd /d "%REPO_ROOT%"
if /i "%~1"=="daily" (
  call "%REPO_ROOT%\set-maingear-ethernet-ip.bat" daily
) else if /i "%~1"=="nopause" (
  call "%REPO_ROOT%\set-maingear-ethernet-ip.bat" nopause
) else (
  call "%REPO_ROOT%\set-maingear-ethernet-ip.bat"
)
