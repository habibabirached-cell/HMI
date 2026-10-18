@echo off
call "%~dp0..\_repo-root.bat"
cd /d "%REPO_ROOT%"
if /i "%~1"=="nopause" (
  call "%REPO_ROOT%\set-ideum-ethernet-ip.bat" nopause
) else (
  call "%REPO_ROOT%\set-ideum-ethernet-ip.bat"
)
