# Wait for Ideum local Docker (backend + UI only — no Vernova).
param(
    [int] $TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
$kioskScript = Join-Path $PSScriptRoot 'kiosk-windows.ps1'
. $kioskScript

Wait-ForTcpPort -Port 5000 -Label 'DCS backend (Docker)' -TimeoutSeconds $TimeoutSeconds
Wait-ForTcpPort -Port 3003 -Label 'DCS UI (Docker)' -TimeoutSeconds $TimeoutSeconds
exit 0
