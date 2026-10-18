@echo off
call "%~dp0..\_repo-root.bat"
call "%~dp0..\_daily-start-prep.bat" "%~dp0"
if errorlevel 1 (
  pause
  exit /b 1
)
cd /d "%REPO_ROOT%"
call "%REPO_ROOT%\BAT\start-malta-combined.bat"
