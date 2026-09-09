param(
    [Parameter(Mandatory = $true)]
    [string] $PortsLog,

    [Parameter(Mandatory = $true)]
    [string] $KioskWindowsScript,

    [Parameter(Mandatory = $true)]
    [string] $DebugLog
)

$ErrorActionPreference = 'Stop'

Set-Content -LiteralPath $PortsLog -Value "=== Port wait log ===" -Encoding UTF8
Add-Content -LiteralPath $DebugLog -Value "" -ErrorAction SilentlyContinue
Add-Content -LiteralPath $DebugLog -Value "----- port wait -----" -ErrorAction SilentlyContinue

try {
    . $KioskWindowsScript
    $script:GenesisTeeLogs = @($PortsLog, $DebugLog)
    Wait-ForTcpPort -Port 5000 -Label 'DCS backend (Docker)'
    Wait-ForTcpPort -Port 3003 -Label 'DCS UI (Docker)'
    Wait-ForTcpPort -Port 5173 -Label 'Vernova npm run dev (Vite on port 5173)' -TimeoutSeconds 300
    exit 0
} catch {
    Write-WaitMsg $_.Exception.Message
    exit 1
}
