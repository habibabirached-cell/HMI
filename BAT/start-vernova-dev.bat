@echo off
REM Helper: npm run dev (called from z_genesis.start.bat).
setlocal
set "VERNOVA_DIR=%~1"
if not exist "%VERNOVA_DIR%\package.json" (
  echo ERROR: package.json not found in %VERNOVA_DIR%
  exit /b 1
)
cd /d "%VERNOVA_DIR%"
call npm run dev
exit /b %errorlevel%
