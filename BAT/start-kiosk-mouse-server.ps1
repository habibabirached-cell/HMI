$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path (Split-Path -Parent $ScriptDir) "dcs-backend"
Set-Location $BackendDir

Write-Host "Kiosk mouse bridge - Ideum trackpad -> Maingear cursor"
Write-Host "Listening on ws://0.0.0.0:8767 (Ideum: ws://192.168.50.1:8767)"
Write-Host "Leave this window open during demo. Ctrl+C to stop."
Write-Host ""

python -c "import websockets" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing websockets..."
    pip install websockets
}

python kiosk_mouse_bridge.py
