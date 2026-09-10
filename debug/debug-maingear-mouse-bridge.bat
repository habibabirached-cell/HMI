@echo off
setlocal EnableDelayedExpansion
REM Maingear-only: diagnose Ideum trackpad -> ws://192.168.50.1:8767 -> Windows cursor
call "%~dp0..\BAT\_paths.bat" 2>nul
set "LOG=%~dp0debug-maingear-mouse-bridge.txt"
set "BACKEND=%REPO_ROOT%\dcs-backend"
if not exist "%BACKEND%\kiosk_mouse_bridge.py" set "BACKEND=%~dp0..\dcs-backend"

echo === Maingear mouse bridge debug === > "%LOG%"
echo Time: %DATE% %TIME% >> "%LOG%"
echo. >> "%LOG%"

echo.
echo [1/5] Is anything listening on TCP 8767?
netstat -an | findstr ":8767" | findstr LISTENING
netstat -an | findstr ":8767" | findstr LISTENING >> "%LOG%" 2>&1
if errorlevel 1 (
  echo   NOT LISTENING — start BAT\start-kiosk-mouse-server.bat or z_genesis.start.bat
  echo NOT LISTENING on 8767 >> "%LOG%"
) else (
  echo   OK — port 8767 is open
)
echo.

echo [2/5] Python + websockets package...
python --version
python --version >> "%LOG%" 2>&1
python -c "import websockets; print('websockets OK')" 2>nul
if errorlevel 1 (
  echo   MISSING websockets — run: pip install "websockets>=12.0,<14"
  echo websockets MISSING >> "%LOG%"
) else (
  echo   OK
)
echo.

echo [3/5] Direct Windows cursor test (should jump cursor briefly)...
python -c "import ctypes; u=ctypes.windll.user32; p=ctypes.wintypes.POINT(); u.GetCursorPos(ctypes.byref(p)); u.SetCursorPos(p.x+80,p.y+40); print('SetCursorPos OK from',p.x,p.y)" 2>>"%LOG%"
echo.

echo [4/5] WebSocket move + click test (needs mouse server running)...
if exist "%BACKEND%\kiosk_mouse_bridge.py" (
  python "%~dp0test_maingear_mouse_ws.py" 127.0.0.1 8767 >> "%LOG%" 2>&1
  type "%LOG%" | findstr /i "ws-test"
) else (
  echo   kiosk_mouse_bridge.py not found at %BACKEND%
)
echo.

echo [5/5] Firewall hint
echo   Ideum browser connects to ws://192.168.50.1:8767 (not Docker).
echo   If step 4 fails but step 1 OK, allow inbound TCP 8767 on Maingear Private network.
echo.

echo Full log: %LOG%
pause
