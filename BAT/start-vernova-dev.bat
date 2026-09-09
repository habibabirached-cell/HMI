@echo off
REM Helper: npm run dev with logging (called from z_genesis.start.bat).
setlocal
set "VERNOVA_DIR=%~1"
set "LOG_FILE=%~2"
if not exist "%VERNOVA_DIR%\package.json" (
  echo ERROR: package.json not found in %VERNOVA_DIR%>> "%LOG_FILE%"
  exit /b 1
)
cd /d "%VERNOVA_DIR%"
echo npm run dev in %CD%>> "%LOG_FILE%"
echo.>> "%LOG_FILE%"
call npm run dev>> "%LOG_FILE%" 2>&1
exit /b %errorlevel%
