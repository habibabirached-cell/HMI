@echo off
call "%~dp0..\_repo-root.bat"
cd /d "%REPO_ROOT%"
call "%REPO_ROOT%\set-ideum-ethernet-ip.bat"
