@echo off
call "%~dp0..\_repo-root.bat"
cd /d "%REPO_ROOT%"
call "%REPO_ROOT%\ideum.copy.bat" nopause
if errorlevel 1 pause
exit /b %errorlevel%
