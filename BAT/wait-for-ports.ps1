param(
    [Parameter(Mandatory = $true)]
    [string] $KioskWindowsScript
)

$ErrorActionPreference = 'Stop'

try {
    . $KioskWindowsScript
    Wait-ForTcpPort -Port 5000 -Label 'DCS backend (Docker)'
    Wait-ForTcpPort -Port 3003 -Label 'DCS UI (Docker)'
    Wait-ForTcpPort -Port 5173 -Label 'Vernova npm run dev (Vite on port 5173)' -TimeoutSeconds 300
    exit 0
} catch {
    Write-Host $_.Exception.Message
    exit 1
}
