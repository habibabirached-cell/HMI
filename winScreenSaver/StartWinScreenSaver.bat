@echo off
setlocal EnableExtensions
title winScreenSaver — OLED wall mouse keepalive
set "NO_PAUSE=0"
if /i "%~1"=="nopause" set "NO_PAUSE=1"

REM Always run from this folder (works when launched via desktop shortcut).
cd /d "%~dp0"

if "%NO_PAUSE%"=="0" (
  echo.
  echo  winScreenSaver — keeps OLED wall displays awake by moving the mouse
  echo  Folder: %CD%
  echo  Edit config.py to change IDLE_SECONDS (currently 120 = 2 minutes)
  echo.
)

python --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python not found. Install Python 3.12+ from https://www.python.org/downloads/
  echo        Check "Add python.exe to PATH" during install.
  if "%NO_PAUSE%"=="0" pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating local virtual environment...
  python -m venv .venv
  if errorlevel 1 (
    echo ERROR: Could not create .venv
    if "%NO_PAUSE%"=="0" pause
    exit /b 1
  )
  set INSTALL_DEPS=1
)

call ".venv\Scripts\activate.bat"

if not defined INSTALL_DEPS (
  python -c "import pynput" >nul 2>&1
  if errorlevel 1 set INSTALL_DEPS=1
)

if defined INSTALL_DEPS (
  echo Installing dependencies...
  python -m pip install -q --upgrade pip
  python -m pip install -q -r requirements.txt
  if errorlevel 1 (
    echo ERROR: pip install failed
    if "%NO_PAUSE%"=="0" pause
    exit /b 1
  )
) else (
  echo Dependencies OK — skipping pip install.
)

set INSTALL_DEPS=

echo.
python mouse_keepalive.py
echo.
if "%NO_PAUSE%"=="0" pause
