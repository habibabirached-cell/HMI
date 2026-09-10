@echo off
setlocal
REM Run on Ideum (192.168.50.2) — same test as ideum-test-show-vernova.sh
set "MAINGEAR=http://192.168.50.1:5000"
set "IDEUM=http://192.168.50.2:5000"

echo === Ideum local role (%IDEUM%) ===
curl -s "%IDEUM%/api/cluster/machine-role"
echo.

echo === Maingear peer role (%MAINGEAR%) ===
curl -s "%MAINGEAR%/api/cluster/machine-role"
echo.

echo === POST showVernova (Grid Connected) ===
curl -s -X POST "%MAINGEAR%/api/cluster/remote-command" -H "Content-Type: application/json" -d "{\"command\":\"showVernova\",\"source\":\"ideum\"}"
echo.

echo Done. Vernova wall on Maingear should be in front.
pause
