$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path (Split-Path -Parent $ScriptDir) "dcs-backend"
Set-Location $BackendDir

# Stop stale bridge (old process ignores focus messages from Ideum).
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*kiosk_mouse_bridge*' } |
    ForEach-Object {
        Write-Host "Stopping old kiosk_mouse_bridge (PID $($_.ProcessId))..."
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
Start-Sleep -Milliseconds 500

Write-Host "Kiosk mouse bridge v2 - trackpad + focus via ws://8767"
Write-Host "Listening on ws://0.0.0.0:8767 (Ideum: ws://192.168.50.1:8767)"
Write-Host "Leave this window open during demo. Ctrl+C to stop."
Write-Host ""

python -c "import websockets" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing websockets..."
    pip install websockets
}

python kiosk_mouse_bridge.py
