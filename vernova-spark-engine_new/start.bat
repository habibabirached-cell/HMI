@echo off
setlocal

title Verona Spark Engine

echo ======================================================
echo           GE VERNOVA - SPARK ENGINE DASHBOARD
echo ======================================================
echo.

:: Ensure working directory is always this script's directory
cd /d "%~dp0"

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js v18 or newer from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in system PATH.
    echo Please ensure Node.js and npm are properly installed.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js and npm detected.
echo.

:: 3. Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Python is not found in system PATH.
    echo Backend FastAPI will be skipped; dashboard will run in static fallback mode.
    echo.
) else (
    echo [OK] Python detected.
)
echo.

:: 4. Check dependencies (node_modules)
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Installing dependencies...
    echo Running 'npm install', please wait...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] 'npm install' failed. Please check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully.
    echo.
)

:: 5. Auto-open browser after a short delay in background
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

:: 6. Start Development Servers (FastAPI + Vite)
echo ======================================================
echo [INFO] Starting Verona Spark Engine Dev Servers...
echo [INFO] Frontend Local URL: http://localhost:5173
echo [INFO] Backend FastAPI will auto-bind to available port.
echo.
echo Press Ctrl+C in this window at any time to stop.
echo ======================================================
echo.

call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly.
    pause
)

