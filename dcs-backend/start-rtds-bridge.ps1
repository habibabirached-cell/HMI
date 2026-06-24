# Start RTDS live meter bridge on Maingear (Windows + RSCAD FX required).
# Run this BEFORE clicking "Live RTDS" in the HMI when the backend is in Docker.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if (-not $env:RSCAD_BIN_PATH) {
    $env:RSCAD_BIN_PATH = "C:\Program Files\RTDS\RSCAD FX 2.7\BIN\lib"
}

Write-Host "RTDS bridge — RSCAD path: $env:RSCAD_BIN_PATH"
Write-Host "Listening on ws://0.0.0.0:8765 (Docker backend uses host.docker.internal:8765)"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

python -c "import websockets" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing websockets for bridge..."
    pip install "websockets>=12.0,<14"
}

python rtds_live_bridge.py
